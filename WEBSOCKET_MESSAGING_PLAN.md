# WebSocket-Powered Messaging — Implementation Plan

Scope-and-design document. **No code is implemented here** — this is the blueprint for adding real-time direct messaging (DMs) to x-clone.

---

## 1. Current State (what exists today)

| Layer          | Stack                                                                        | Relevant facts                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend        | Express 4, Mongoose 8, MongoDB, `ts-node`/`nodemon`                          | Single `app.listen(3001)` in `backend/src/index.ts`; app assembled in `backend/src/app.ts`. Routes → controllers → Mongoose models.                       |
| Auth (backend) | JWT verified in `backend/src/middleware/require-auth.ts`                     | Short-lived (5 min) HS256 token, issuer `x-clone-frontend`, audience `x-clone-backend`, `sub = userId`. Secret `BACKEND_JWT_SECRET` shared with frontend. |
| Users          | next-auth MongoDB adapter                                                    | No backend `User` model. Users live in the `users` collection, read via `getUsersCollection()` in `backend/src/db/connection.ts`.                         |
| Frontend       | Next.js 16 (App Router), React 18, TanStack Query, axios, next-auth (Google) | `apiClient.ts` auto-attaches the backend token via interceptor + refreshes on 401. `messages/page.tsx` is a stub (`<div>Messages Page</div>`).            |
| Config         | `NEXT_PUBLIC_SERVER_URL` (frontend → backend), `FRONTEND_URL` (CORS origin)  | Token minted by `frontend/src/app/api/auth/backend-token/route.ts`.                                                                                       |

**Key constraint:** the backend token is minted for 5 minutes. A WebSocket connection lives far longer. The auth model must account for that (see §4).

---

## 2. Goals & Non-Goals

### Goals (v1)

- 1-to-1 direct messaging between two users.
- Real-time delivery over WebSocket (sender → recipient) without polling.
- Persistent message history (survives reconnect / page reload), paginated.
- Conversation list (inbox) with last-message preview + unread counts.
- Delivery/read receipts and typing indicators.
- Online/offline presence (best-effort).
- Graceful reconnection and message backfill after disconnect.

### Non-Goals (v1 — note as future work)

- Group chats / channels.
- Media/image messages (text only in v1; schema leaves room).
- End-to-end encryption.
- Message edit/delete (schema leaves room; UI deferred).
- Horizontal scaling across multiple backend instances (single instance in v1; Redis adapter path noted in §9).
- Push notifications / email.

---

## 3. Transport Decision: Socket.IO vs raw `ws`

**Recommendation: Socket.IO.**

| Concern                    | Socket.IO                               | raw `ws`                            |
| -------------------------- | --------------------------------------- | ----------------------------------- |
| Rooms / per-user targeting | Built-in (`socket.join`, `io.to(room)`) | Hand-rolled map of userId → sockets |
| Reconnection + backoff     | Built-in client                         | Hand-rolled                         |
| Auth handshake             | `io.use()` middleware                   | Hand-rolled on `upgrade`            |
| Acks (delivery confirm)    | Built-in callback acks                  | Hand-rolled correlation ids         |
| Fallback / heartbeat       | Built-in ping/pong                      | Hand-rolled                         |
| Redis multi-instance       | `@socket.io/redis-adapter`              | Fully manual                        |

The messaging feature needs rooms, per-user routing, acks, reconnection, and a future scaling path — all first-class in Socket.IO. Raw `ws` would mean re-implementing them. Cost: one dependency each side (`socket.io`, `socket.io-client`).

---

## 4. Authentication over WebSocket (critical design)

The existing 5-minute token is designed for stateless REST calls; a socket outlives it. Approach:

1. **Handshake auth.** Client passes the current backend token in the Socket.IO handshake (`auth: { token }`). Server verifies it with the _same_ `verifyToken()` logic from `require-auth.ts` inside an `io.use()` middleware. On success, attach `socket.data.userId`. On failure, reject the connection.
2. **Token proves identity at connect only.** Once verified, the socket is trusted for its lifetime — we do NOT force a reconnect every 5 minutes. The token's short TTL protects the REST surface; for the socket it's a one-time proof of who you are.
3. **Reconnect re-auth.** Socket.IO reconnects automatically. On each reconnect the client fetches a fresh backend token (reuse `getBackendToken()` from `apiClient.ts`) and re-sends it in the handshake, so a torn-down socket always re-proves identity.
4. **Refactor `verifyToken` for reuse.** Extract the JWT-verify into a shared function importable by both `require-auth.ts` (REST) and the socket middleware (avoid divergence). No behavior change to REST.

**Why not periodic token re-validation on the live socket?** Adds complexity and a disconnect cliff every 5 minutes for no security gain — the peer is already authenticated and the transport is trusted. Revoke by disconnecting the socket server-side if/when we add a ban/logout signal (future).

---

## 5. Data Model (MongoDB / Mongoose)

Two new models in `backend/src/models/`.

### 5.1 `Conversation.ts`

```
participants: [ObjectId ref 'User']   // exactly 2 in v1, sorted for dedupe
lastMessage:  ObjectId ref 'Message'  // denormalized for inbox preview
lastMessageAt: Date                   // sort key for inbox
createdAt:    Date

// unread tracking, per participant:
unread: [{ user: ObjectId, count: Number }]   // or a Map keyed by userId
```

Indexes:

- `{ participants: 1 }` (find conversations for a user).
- Unique compound on the sorted participant pair to prevent duplicate conversations — enforce a canonical `participantsKey` string field (`sortedId1_sortedId2`) with a unique index, since arrays can't be trivially uniquely-indexed as a pair.
- `{ lastMessageAt: -1 }` for inbox ordering.

### 5.2 `Message.ts`

```
conversation: ObjectId ref 'Conversation'  (required, indexed)
sender:       ObjectId ref 'User'          (required)
content:      String (required, 1..2000)
readBy:       [ObjectId]                    // users who've read it
deliveredTo:  [ObjectId]                    // future: multi-device
createdAt:    Date (default now)
// reserved for future: images: [String], editedAt, deletedAt
```

Indexes:

- `{ conversation: 1, createdAt: -1 }` — the pagination workhorse.

**Users:** continue reading names/images from the `users` collection via `getUsersCollection()`; do NOT create a backend `User` model (stay consistent with existing code).

---

## 6. Backend Implementation

### 6.1 Server bootstrap refactor

`index.ts` currently does `app.listen(PORT)`. Socket.IO needs the raw HTTP server:

- Create `const server = http.createServer(app)`.
- `const io = new Server(server, { cors: { origin: FRONTEND_URL } })`.
- `server.listen(PORT)`.
- Keep `app.ts` unchanged for Express wiring; add a new `backend/src/socket/` module that receives `io` and registers handlers. Export an `initSocket(server)` called from `index.ts`.

### 6.2 New files

| File                                            | Responsibility                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `backend/src/models/Conversation.ts`            | Schema §5.1                                                                           |
| `backend/src/models/Message.ts`                 | Schema §5.2                                                                           |
| `backend/src/socket/index.ts`                   | Create `io`, register auth middleware + connection handler                            |
| `backend/src/socket/auth.ts`                    | `io.use()` handshake verify (reuses shared `verifyToken`)                             |
| `backend/src/socket/handlers.ts`                | Event handlers (§6.4)                                                                 |
| `backend/src/socket/presence.ts`                | In-memory `Map<userId, Set<socketId>>` for online tracking                            |
| `backend/src/controllers/message-controller.ts` | REST fallbacks: list conversations, fetch history (paginated), create conversation    |
| `backend/src/routes/message-routes.ts`          | REST routes, mounted under `/api/message` in `routes/index.ts` (behind `requireAuth`) |

### 6.3 REST surface (history, inbox, fallback)

WebSocket handles live events; REST handles initial load + pagination (mirrors existing paginated post/comment pattern).

| Method  | Path                                                   | Purpose                                                                                          |
| ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `GET`   | `/api/message/conversations`                           | Inbox list for `req.userId`, sorted by `lastMessageAt`, with last-message preview + unread count |
| `POST`  | `/api/message/conversations`                           | Get-or-create a conversation with `{ recipientId }` (canonical pair dedupe)                      |
| `GET`   | `/api/message/conversations/:id/messages?page=&limit=` | Paginated history (mirror `getPostsPaginated` / `getCommentsPaginated`)                          |
| `PATCH` | `/api/message/conversations/:id/read`                  | Mark conversation read (REST fallback for read receipts)                                         |

All behind `requireAuth`. Every handler must assert `req.userId` is a participant of the conversation (authorization, not just authentication).

### 6.4 Socket events

**Rooms:** each user joins a personal room `user:<userId>` on connect. Message fan-out targets the recipient's personal room — simplest correct model for 1:1 and multi-tab.

Client → Server:
| Event | Payload | Server action |
| --- | --- | --- |
| `message:send` | `{ conversationId?, recipientId?, content }` + ack callback | Validate; get-or-create conversation; persist `Message`; update `Conversation.lastMessage/lastMessageAt`, bump recipient unread; emit `message:new` to both participants' rooms; ack `{ ok, message }` to sender |
| `message:read` | `{ conversationId }` | Set `readBy`, reset unread for user; emit `message:read` to the other participant |
| `typing:start` / `typing:stop` | `{ conversationId }` | Relay `typing` to the other participant's room (not persisted) |

Server → Client:
| Event | Payload |
| --- | --- |
| `message:new` | `{ message, conversation }` |
| `message:read` | `{ conversationId, userId, readAt }` |
| `typing` | `{ conversationId, userId, isTyping }` |
| `presence` | `{ userId, online }` |

**Validation & safety:**

- Sanitize/trim `content`, enforce length (1..2000).
- Authorize sender ∈ participants on every event.
- Basic rate limit (e.g. token bucket per socket) to blunt spam/abuse.
- Persist first, then emit — so a delivered message is always a stored message (ack reflects DB success).

### 6.5 Presence

`presence.ts` keeps `Map<userId, Set<socketId>>`. On connect add; on `disconnect` remove; when a user's set transitions empty↔non-empty, emit `presence` to that user's followers/conversation partners (v1: emit to active conversation partners only, keep it cheap). In-memory only — resets on restart, acceptable for v1.

---

## 7. Frontend Implementation

### 7.1 Dependencies

- `socket.io-client`.

### 7.2 New files

| File                                                   | Responsibility                                                                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/app/lib/socket.ts`                       | Singleton Socket.IO client; connects with `auth: { token }` from `getBackendToken()`; reconnection config; re-auth on reconnect   |
| `frontend/src/app/utils/messageApi.ts`                 | REST calls (conversations list, history pagination, get-or-create) — mirror `fetchInfo.ts`                                        |
| `frontend/src/app/hooks/useSocket.ts`                  | React hook: lifecycle, connect/disconnect, expose emit + subscribe                                                                |
| `frontend/src/app/hooks/useConversations.ts`           | TanStack Query for inbox list                                                                                                     |
| `frontend/src/app/hooks/useMessages.ts`                | `useInfiniteQuery` for history + live-merge of `message:new`                                                                      |
| `frontend/src/app/(navPages)/messages/page.tsx`        | Replace stub: inbox pane + conversation pane (responsive)                                                                         |
| `frontend/src/app/components/messages/*`               | `ConversationList`, `ConversationListItem`, `MessageThread`, `MessageBubble`, `MessageComposer`, `TypingIndicator`, `PresenceDot` |
| `frontend/src/app/types/Message.ts`, `Conversation.ts` | Shared TS types                                                                                                                   |

### 7.3 State strategy (REST + WS together)

- **Initial load & pagination:** TanStack Query (`useInfiniteQuery`) hitting the REST endpoints — reuses caching, mirrors existing post/comment paging.
- **Live updates:** the socket layer pushes `message:new` / `message:read` / `typing` into the Query cache via `queryClient.setQueryData` (append to the thread, update inbox preview + unread). Single source of truth = Query cache.
- **Optimistic send:** on `message:send`, optimistically append with a temp id + "sending" state; reconcile on ack (`{ ok, message }`) or mark failed on timeout/error.
- **Token:** socket auth reuses `getBackendToken()` (already caches + refreshes), so no second token path.

### 7.4 UX behaviors

- Auto-scroll to newest; "new messages" pill when scrolled up.
- Unread badge on the `messages` nav item (subscribe to socket globally, not only on the messages page — mount the socket provider high in the tree).
- Typing indicator debounced (reuse `use-debounce`, already a dependency).
- Reconnect banner + automatic history backfill (refetch newest page on reconnect to close any gap).

### 7.5 Global socket provider

Add a `SocketProvider` (client component) mounted in the App Router layout (alongside the existing `SessionProvider`/`query-client-provider`) so presence, unread counts, and incoming messages work app-wide, not just on `/messages`. Only connect when a session exists.

---

## 8. Configuration & Ops

- **New env:** none strictly required — reuse `NEXT_PUBLIC_SERVER_URL` (socket URL) and `FRONTEND_URL` (Socket.IO CORS origin). Add `SOCKET_PATH` only if a custom path is wanted.
- **CORS:** configure Socket.IO `cors.origin` = `FRONTEND_URL` (match existing Express CORS).
- **Docker:** no compose change — port 3001 already exposed; WebSocket upgrades ride the same port. Confirm any future reverse proxy passes `Upgrade`/`Connection` headers.
- **Graceful shutdown:** on `SIGTERM`, `io.close()` before `server.close()`.

---

## 9. Scaling Path (future, document only)

Single backend instance in v1. To scale horizontally later:

- Add `@socket.io/redis-adapter` + Redis so `io.to(room)` fans out across instances.
- Move presence from in-memory Map to Redis.
- Sticky sessions at the load balancer (or rely on the Redis adapter + polling→websocket upgrade).

---

## 10. Testing

Follow existing patterns (`*.test.ts` beside source; backend custom runner, frontend Jest + Testing Library + MSW).

**Backend**

- Unit: Conversation/Message model validation; get-or-create dedupe; unread bump/reset; authorization guard (non-participant rejected).
- Socket integration: spin up `io` on an ephemeral port, connect a `socket.io-client`, assert handshake auth (valid/invalid token), `message:send` persists + emits `message:new` to recipient, read receipts, typing relay.
- REST: conversations list ordering, paginated history, 401 without token, 403 for non-participant.

**Frontend**

- Component: `MessageComposer` submit, `MessageThread` render + optimistic bubble, `ConversationList` unread badge.
- Hook: `useMessages` merges a socket `message:new` into cache; optimistic reconcile on ack.
- Mock the socket (small fake emitter) rather than a live server.

**Manual smoke:** two browser sessions (two Google accounts), send both directions, verify live delivery, typing, read receipts, reconnect after backend restart.

---

## 11. Build / CI parity checklist (repo-specific)

Root `npm run check` runs `format:check && lint && typecheck && build && test`. Before considering done:

- `prettier` version parity across root/backend/frontend (known drift risk — keep all at `3.6.2`).
- New backend files type-check under `tsc --noEmit` (note `target: es2016`, `module: commonjs`).
- `socket.io-client` types resolve in the frontend build.
- No new high-severity `npm audit` findings (`deps:check`).

---

## 12. Suggested Implementation Order (incremental, each shippable)

1. **Models + REST history** (`Conversation`, `Message`, `/api/message/*`) — no WS yet; UI can load/read via REST.
2. **Server bootstrap refactor** (`http.createServer` + `initSocket`) + **handshake auth** (extract shared `verifyToken`).
3. **Core socket events** (`message:send` / `message:new`) + persistence + acks.
4. **Frontend socket layer** (`socket.ts`, `useSocket`, `SocketProvider`) + replace `messages/page.tsx` with inbox + thread wired to REST + WS.
5. **Read receipts + unread counts** (socket + REST fallback + nav badge).
6. **Typing indicators + presence.**
7. **Reconnection hardening + backfill.**
8. **Tests + CI parity pass** (§10, §11).

Each step is independently commit-able (aligns with the granular-commit rule), and steps 1–3 give a working text DM before any polish lands.

---

## 13. Open Questions / Decisions to Confirm

1. **Who can DM whom?** Anyone, or only mutual follows / people you follow? Affects the get-or-create guard. (v1 assumption: anyone, pending confirmation.)
2. **Message length cap** — 2000 chars assumed; confirm.
3. **Presence scope** — broadcast to all followers vs only active conversation partners? (v1 assumption: conversation partners only.)
4. **Media in v1?** Currently deferred; confirm text-only is acceptable for first release.
