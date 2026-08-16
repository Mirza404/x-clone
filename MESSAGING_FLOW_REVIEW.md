# Messaging Flow Review

## Scope

This document reviews the current direct-messaging implementation in this repository. It focuses on the actual Socket.IO, REST, MongoDB, and React Query flow, and separates confirmed implementation behavior from risks that require runtime or concurrency testing.

The system is not using a raw WebSocket protocol. It uses Socket.IO, which provides an event-based API over Engine.IO and can negotiate WebSocket or fall back to HTTP long-polling. The application-level flow is therefore Socket.IO events plus REST requests, not individual HTTP-style WebSocket requests.

Validation performed during this review:

- Backend typecheck passed.
- Backend tests passed: 149/149.
- Focused frontend messaging hook tests passed: 38/38.

The passing tests cover many happy paths and validation cases, but they do not fully exercise multi-tab subscription behavior, reconnect buffering, concurrent MongoDB writes, or multiple backend instances.

## Current flow

### Connection and authentication

1. `SocketProvider` is mounted globally from the frontend layout.
2. `useSocket` obtains a module-level singleton from `frontend/src/app/lib/socket.ts`.
3. When the NextAuth session becomes authenticated, the client calls `socket.connect()`.
4. Socket.IO invokes the async `auth` callback, which obtains a backend JWT from the Next.js backend-token route.
5. The backend verifies that JWT in Socket.IO middleware.
6. The server stores the authenticated user ID in `socket.data.userId`.
7. The socket joins `user:<userId>`.

Relevant files:

- `frontend/src/app/lib/socket.ts`
- `frontend/src/app/hooks/useSocket.ts`
- `frontend/src/app/utils/SocketProvider.tsx`
- `backend/src/socket/auth.ts`
- `backend/src/socket/index.ts`

The backend token lasts five minutes, but the server only validates it during the handshake. A live socket is trusted for its lifetime. Reconnects obtain a token again.

### Initial data loading

- `GET /api/message/conversations` loads the inbox.
- `GET /api/message/conversations/:id/messages?page=&limit=` loads history.
- `POST /api/message/conversations` gets or creates a one-to-one conversation.
- `PATCH /api/message/conversations/:id/read` is the REST read fallback.

React Query stores the result. Socket events then update the relevant query cache.

### Sending a message

The frontend adds an optimistic temporary message and emits:

```text
message:send
  -> validate and trim text
  -> resolve conversation by ID or recipient ID
  -> verify sender is a participant
  -> create Message
  -> update Conversation.lastMessage and unread count
  -> emit message:new to sender and recipient rooms
  -> acknowledge the sender
```

The server persists before emitting, which is a good ordering decision. The acknowledgement means the server completed its persistence/update path; it does not mean the recipient received or rendered the message.

### Reading messages

`message:read` verifies participation, resets the user’s conversation unread counter, adds the user to `readBy` for messages in that conversation, and emits a `message:read` event to the other participant.

### Typing and presence

- Typing events query the conversation to authorize the sender, then relay a transient `typing` event.
- Presence is tracked in an in-memory `Map<userId, Set<socketId>>`.
- A user is online while at least one socket is connected.
- Presence is broadcast to conversation partners.

## Findings

### Finding 1: Conversation summary updates can lose concurrent writes

**Status: fixed.** `handleMessageSend` in `backend/src/socket/handlers.ts` no longer loads the conversation into memory, mutates it, and calls `conversation.save()`. It now issues an atomic `Conversation.findOneAndUpdate` with `$set` for `lastMessage`/`lastMessageAt` and `$inc` on `unread.$[elem].count` (scoped to the recipient via `arrayFilters`), so two concurrent sends each apply their own increment instead of one clobbering the other's read. A `findByIdAndUpdate` with `$push` fallback handles the (legacy-data) case where the recipient has no existing `unread` entry to match against. This does not cover `lastMessage`/`lastMessageAt` ordering under out-of-order writes (a slow request could still overwrite a newer `lastMessageAt` with an older one) — only the increment-loss race described below is closed.

Two sends for the same conversation used to interleave like this:

```text
Request A reads conversation with unread = 0
Request B reads conversation with unread = 0
Request A changes unread to 1 and saves
Request B changes its stale copy to unread = 1 and saves
```

Both `Message` documents existed, but the conversation summary reflected only one update.

**Relevant code:** `backend/src/socket/handlers.ts`, `handleMessageSend`; test coverage in `backend/src/socket/handlers.test.ts` (`stubConversationUpdate`).

**Remaining work:** a concurrency test that actually races two simultaneous sends against a real/in-memory MongoDB instance (the current tests stub the atomic call rather than proving the race is closed end-to-end). `lastMessage`/`lastMessageAt` are still last-write-wins with no ordering guard.

### Finding 2: Message sending is not idempotent

**Status: fixed.** The client now generates a `clientId` per send and sends it in `message:send`. `Message` stores `clientId` with a `{ sender, clientId }` sparse unique index. The server checks for an existing message with that `sender`/`clientId` before creating one and returns it instead of creating a duplicate; a duplicate-key error from a concurrent race is caught and resolved by re-reading the winning document. Retries no longer double-count unread or duplicate the message.

The client creates a temporary local ID, but that ID is not sent to the server or stored in MongoDB. The server therefore cannot distinguish a retry of the same logical send from a new message.

The client also marks a message failed after ten seconds. Socket.IO can buffer an emit while disconnected and send it after reconnect. This creates a problematic sequence:

```text
client adds optimistic message
client emits while disconnected
ten seconds pass; client marks it failed
socket reconnects and buffered event reaches server
server persists it
```

The user may retry and create a duplicate. The original successful server message may also arrive after the temporary message has already been marked failed, making reconciliation less reliable.

**Relevant code:** `frontend/src/app/hooks/useMessages.ts`, optimistic message creation and acknowledgement timeout.

**Proposed direction:** generate a client message ID, send it in `message:send`, persist it with a unique index scoped appropriately, and make the server return the existing message for retries. Decide explicitly whether sends while disconnected should be queued or rejected.

### Finding 3: `useConversations` can process one event multiple times

**Status: fixed.** The `message:new` subscription no longer lives in `useConversations`. It moved to a new `useConversationsCacheBridge` hook, mounted exactly once via `ConversationsCacheBridge` inside `SocketProvider` in the root layout. `useConversations` is now a plain `useQuery` wrapper with no socket subscription; every UI surface (messages page, mobile navigation, floating message UI) reads the same cache without registering its own listener. A regression test (`useConversations.test.tsx`, "increments unreadCount only once when multiple UI surfaces mount useConversations") mounts three consumers against one bridge and asserts a single `message:new` event bumps `unreadCount` by exactly one, and that only one handler is ever registered.

This does not address the ordering race with `useMessages` noted below (an open conversation being marked read while `useConversations` is also processing the same event) — that's a separate concern from the multiplied-listener bug this finding was about.

**Relevant code:** `frontend/src/app/hooks/useConversations.ts` (`useConversationsCacheBridge`), `frontend/src/app/components/messages/ConversationsCacheBridge.tsx`, `frontend/src/app/layout.tsx`.

### Finding 4: Inbox ordering is not updated when a new message arrives

**Status: fixed.** `applyNewMessage` now re-sorts the cached inbox by
`lastMessageAt` after updating a conversation, so a conversation with a new
message immediately moves to its correct position without waiting for a
refetch. The single global cache bridge remains the owner of this update.

When `message:new` updates an existing conversation, `applyNewMessage` changes its preview, timestamp, and unread count but preserves the original array position. The server sorts the inbox by `lastMessageAt`, but the client-side live update does not reorder it.

The inbox can therefore show a conversation with a newly received message below older conversations until a refetch occurs.

**Relevant code:** `frontend/src/app/hooks/useConversations.ts`, `applyNewMessage`.

**Relevant coverage:** `frontend/src/app/hooks/useConversations.test.tsx`
verifies that an updated conversation moves ahead of older entries.

### Finding 5: Reconnect recovery is incomplete

**Status: fixed at the query-recovery level.** The global conversations cache
bridge now detects a disconnected-to-connected transition and invalidates both
the inbox query and active message-history queries. React Query refetches those
active views from the durable REST state, recovering application events missed
while the socket was offline.

Socket.IO reconnects the transport, but application events missed during the disconnected period are not replayed by the server.

The active message thread attempts a refetch after a connection transition. The conversation list does not have equivalent global reconnect invalidation. If no thread is open, an incoming message during the outage can leave the inbox stale.

There is still no server-side event sequence number for replaying only the
missed events. Recovery intentionally uses authoritative query refetches.

**Relevant code:** `frontend/src/app/hooks/useMessages.ts`, reconnect refetch effect; `frontend/src/app/hooks/useConversations.ts`, which has no corresponding reconnect backfill.

**Relevant coverage:** `frontend/src/app/hooks/useConversations.test.tsx`
verifies that reconnect invalidates both query families.

### Finding 6: Delivery receipts are not implemented despite the data model suggesting they are

**Status: resolved by deferring delivery receipts.** The unused `deliveredTo`
field has been removed from the Mongoose schema and frontend `Message`
contract. The application now exposes only the read state it actually
implements, rather than suggesting that server emission is recipient delivery.

Before this change, `Message` contained a `deliveredTo` field that the send
flow never updated. The sender acknowledgement still occurs after database
persistence and server emission; it is not an acknowledgement from the
recipient socket.

The current implementation supports a form of read receipt through `readBy`, but not a true delivery receipt.

**Relevant code:** `backend/src/models/Message.ts`, `backend/src/socket/handlers.ts`.

True delivery receipts remain deferred until recipient acknowledgement,
multi-device semantics, retry behavior, and a durable update policy are defined.

### Finding 7: Offset pagination can produce gaps or duplicates during live use

**Status: fixed.** History now uses an opaque cursor backed by the stable
`(createdAt, _id)` pair. The backend queries strictly before that boundary,
orders by both fields, and fetches one extra record to determine whether an
older page exists. New inserts at the newest end can no longer shift subsequent
history boundaries.

Previously, history was fetched with descending `createdAt`, `skip`, and
`limit`, then reversed for display. New messages inserted at the newest end
could shift page boundaries between requests.

For example, page 1 could be loaded, several new messages could arrive, and
page 2's offset would then refer to a different slice. Messages could overlap
or be skipped.

**Relevant code:** `backend/src/controllers/message-controller.ts`, cursor
filter and serialization; `backend/src/models/Message.ts`, compound cursor
index; `frontend/src/app/utils/messageApi.ts` and
`frontend/src/app/hooks/useMessages.ts`, cursor-based infinite query handling.

**Relevant coverage:** `backend/src/controllers/message-controller.test.ts`
inserts a newer message between page requests and verifies the older page has
neither a gap nor overlap. Frontend API and hook tests cover cursor propagation.

### Finding 8: Socket-based conversation creation does not verify that the recipient exists

**Status: fixed.** REST and Socket.IO now call the same
`getOrCreateConversation` service. The service verifies the recipient in the
users collection before looking up or creating the participant pair, so the
socket path cannot create a conversation for a nonexistent user.

Previously, only the REST endpoint checked the users collection. The Socket.IO
`recipientId` path checked ObjectId validity but could proceed directly to
conversation creation.

That difference between the two entry points has been removed.

**Relevant code:** `backend/src/services/conversation-service.ts`, used by
`backend/src/socket/handlers.ts` and
`backend/src/controllers/message-controller.ts`.

**Relevant coverage:** `backend/src/socket/handlers.test.ts` verifies that a
nonexistent recipient is rejected before message creation.

### Finding 9: Conversation creation has a duplicate-key race

**Status: fixed.** Conversation creation is centralized in
`getOrCreateConversation`, which performs `findOneAndUpdate` with `upsert` and
`$setOnInsert` against the unique canonical `participantsKey`. REST and
Socket.IO therefore share the same race-safe behavior. A duplicate-key fallback
re-reads the winning conversation defensively.

Both REST and Socket.IO previously used a read-then-create pattern for a
canonical participant pair:

```text
findOne(participantsKey)
if not found: create(...)
```

Two simultaneous requests could both observe no conversation and race to
create it. The unique index prevented two durable records, but the losing
request fell into the generic error path rather than retrieving the record
created by the winner.

**Relevant code:** `backend/src/services/conversation-service.ts`; unique
`participantsKey` in `backend/src/models/Conversation.ts`.

**Relevant coverage:** `backend/src/services/conversation-service.test.ts`
races two calls and verifies both receive the same winning conversation;
controller and socket tests verify both entry points use the shared path.

### Finding 10: REST helpers convert failures into successful empty results

**Status: fixed.**

`getConversations` and `getConversationMessages` still log useful context, but
now rethrow the original error. React Query receives a rejected promise and can
expose, retry, and recover from the failure instead of treating an outage as a
successful empty inbox or thread.

**Relevant code:** `frontend/src/app/utils/messageApi.ts`.

Regression coverage verifies that both helpers reject with the original error.

### Finding 11: REST pagination parameters are not sufficiently bounded

**Status: fixed.**

The cursor-based history endpoint now defaults `limit` to 20, accepts only a
positive integer, caps it at 100, and returns `400` for malformed, fractional,
zero, negative, array, or unsafe-integer values. The database fetch remains one
record larger than the accepted limit so the endpoint can determine whether a
next cursor exists.

**Relevant code:** `backend/src/controllers/message-controller.ts`, pagination parsing.

Regression coverage verifies invalid limits and the maximum database page size.

### Finding 12: Image input validation is shallow

**Status: implementation complete; strict production cutover pending.**

The shared upload path now requests an authenticated, rate-limited backend
signature, uploads directly to the configured Cloudinary tenant with a
server-generated user-scoped public ID, and completes the upload through the
backend. Completion verifies Cloudinary's response signature and authoritative
resource metadata before registering the canonical URL to that user. New post,
comment, reply, and message writes all pass through the same ownership check;
URLs are capped at 2,048 characters and image arrays at eight entries.

The rollout bridge `MEDIA_ALLOW_UNREGISTERED_CLOUDINARY` is intentionally a
manually managed Render setting. Set it to `true` only while the old frontend is
still live: that mode accepts unregistered URLs from the exact configured tenant
so old unsigned-client uploads continue to work, but it still rejects external
URLs and assets already registered to another user. After the signed frontend is
verified, set it to `false` and disable the old `x_clone` unsigned preset. Strict
registry-backed ownership—and therefore full closure of this finding—starts at
that cutover.

**Relevant code:** `backend/src/services/media-service.ts`,
`backend/src/controllers/media-controller.ts`, `backend/src/socket/handlers.ts`,
and `frontend/src/app/utils/imageUtils.ts`.

Regression coverage exercises signing, response tampering, tenant and ownership
rejection, authoritative size checks, legacy edit retention, and every write
boundary. A live smoke test also completed and then cleaned up a signed upload in
the `dhumjqe9v` tenant.

### Finding 13: Read operations are optimistic and have weak failure handling

**Status: fixed.**

The frontend now waits for the `message:read` acknowledgement before clearing
the cached unread count. A rejected or timed-out socket operation falls back to
REST; the cache changes only after either path confirms success, and a failure
of both paths invalidates the conversations query so server state is reconciled.

Both REST and Socket.IO now update only unread messages sent by another user,
rather than also adding the reader to messages they authored.

**Relevant code:** `frontend/src/app/hooks/useMessages.ts`, `markAsRead`; `backend/src/socket/handlers.ts`, `handleMessageRead`; REST equivalent in `message-controller.ts`.

Regression coverage exercises socket success, rejection, timeout, REST fallback,
total failure reconciliation, and the narrower backend update filters.

### Finding 14: Presence is correct for one process but not horizontally scalable

**Status: fixed for the current deployment topology.**

Presence remains process-local, but `render.yaml` now explicitly pins the
backend to one instance. The deployed topology therefore matches the assumption
made by presence tracking and Socket.IO rooms instead of relying on an implicit
platform default.

**Relevant code:** `backend/src/socket/presence.ts`; Socket.IO initialization in `backend/src/socket/index.ts`.

Horizontal scaling still requires a shared Socket.IO adapter and presence store,
typically Redis. That infrastructure must be added before increasing
`numInstances`; presence should remain best-effort even after that migration.

## Things that are not currently problems

These parts of the implementation are sound or reasonable for the current scope:

- Socket handshake authentication is implemented and reuses the backend JWT verification function.
- REST and Socket.IO both check conversation participation before exposing or mutating messages.
- The server persists a message before emitting `message:new`.
- Personal user rooms support multiple tabs for the same account.
- The in-memory presence map correctly keeps a user online while any one of their sockets remains connected.
- Message content is trimmed and bounded to 2,000 characters.
- The existing backend and focused frontend tests pass.

## Recommended order for a deeper follow-up

1. Add tests for multiple mounted `useConversations` consumers.
2. Add concurrent-send and concurrent-conversation-creation tests.
3. Decide whether disconnected sends are queued, rejected, or retried.
4. Add client-message idempotency.
5. Centralize socket event processing and query-cache mutation.
6. Fix REST error propagation and pagination validation.
7. Add reconnect backfill for inbox and threads.
8. Move to cursor-based history pagination.
9. Decide whether delivery receipts are actually required.
10. Address atomic conversation updates and multi-instance deployment when needed.
