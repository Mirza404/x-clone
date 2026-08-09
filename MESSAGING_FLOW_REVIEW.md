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

**Status: confirmed design risk; not proven by the current unit tests.**

In `backend/src/socket/handlers.ts`, message sending loads a conversation, mutates `lastMessage`, `lastMessageAt`, and an unread entry in memory, and then calls `conversation.save()`.

Two sends for the same conversation can interleave like this:

```text
Request A reads conversation with unread = 0
Request B reads conversation with unread = 0
Request A changes unread to 1 and saves
Request B changes its stale copy to unread = 1 and saves
```

Both `Message` documents may exist, but the conversation summary can reflect only one update. The same issue can affect `lastMessage` and `lastMessageAt`.

This matters because the conversation document is the source for inbox previews and unread counts. The messages themselves may be correct while the inbox is wrong.

**Relevant code:** `backend/src/socket/handlers.ts`, especially the conversation mutation before `conversation.save()`.

**Proposed direction:** use atomic updates such as `$inc` for unread counts and `$set` for the last-message fields. If message creation and summary update must be all-or-nothing, use a MongoDB transaction. Add a concurrency test with two simultaneous sends.

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

**Status: confirmed from the component structure.**

`useConversations` installs a `message:new` listener every time the hook is mounted. The hook is used by multiple UI surfaces, including the messages page, mobile navigation, and floating/message UI.

Each listener updates the same React Query key. For an incoming message, each listener can increment `unreadCount`. The result depends on how many of those components are mounted at the same time.

This can produce inflated unread counts. It also creates ordering races with `useMessages`, which may immediately mark an open conversation as read.

**Relevant code:** `frontend/src/app/hooks/useConversations.ts`, the `subscribe('message:new', ...)` effect; callers include the messages page, mobile navigation, and floating message components.

**Proposed direction:** install one global socket event-to-query-cache bridge in `SocketProvider` or a dedicated provider. Hooks should read/query state rather than each registering their own cache mutation listener. Add a test with two mounted consumers and one incoming event.

### Finding 4: Inbox ordering is not updated when a new message arrives

**Status: confirmed.**

When `message:new` updates an existing conversation, `applyNewMessage` changes its preview, timestamp, and unread count but preserves the original array position. The server sorts the inbox by `lastMessageAt`, but the client-side live update does not reorder it.

The inbox can therefore show a conversation with a newly received message below older conversations until a refetch occurs.

**Relevant code:** `frontend/src/app/hooks/useConversations.ts`, `applyNewMessage`.

**Proposed direction:** update the conversation, remove it from its previous position, and insert it according to `lastMessageAt`. The same single global event bridge should own this behavior.

### Finding 5: Reconnect recovery is incomplete

**Status: confirmed.**

Socket.IO reconnects the transport, but application events missed during the disconnected period are not replayed by the server.

The active message thread attempts a refetch after a connection transition. The conversation list does not have equivalent global reconnect invalidation. If no thread is open, an incoming message during the outage can leave the inbox stale.

There is also no server-side cursor or event sequence number that would allow the client to request exactly what it missed.

**Relevant code:** `frontend/src/app/hooks/useMessages.ts`, reconnect refetch effect; `frontend/src/app/hooks/useConversations.ts`, which has no corresponding reconnect backfill.

**Proposed direction:** at minimum invalidate/refetch the inbox and active histories after reconnect. For stronger guarantees, add a message cursor/backfill endpoint and treat Socket.IO events as notifications rather than the only recovery mechanism.

### Finding 6: Delivery receipts are not implemented despite the data model suggesting they are

**Status: confirmed.**

`Message` contains a `deliveredTo` field, but the send flow never updates it. The sender acknowledgement occurs after database persistence and server emission; it is not an acknowledgement from the recipient socket.

The current implementation supports a form of read receipt through `readBy`, but not a true delivery receipt.

**Relevant code:** `backend/src/models/Message.ts`, `backend/src/socket/handlers.ts`.

**Proposed direction:** either remove/defer `deliveredTo` from the active contract or define delivery precisely. A real delivery state would require recipient-side acknowledgement, multi-device semantics, retry behavior, and a durable update policy.

### Finding 7: Offset pagination can produce gaps or duplicates during live use

**Status: confirmed design risk.**

History is fetched with descending `createdAt`, `skip`, and `limit`, then reversed for display. New messages inserted at the newest end can shift page boundaries between requests.

For example, page 1 is loaded, then several new messages arrive, and page 2 is fetched. Page 2’s offset now refers to a different slice than it did before the new messages arrived. Messages can overlap or be skipped.

**Relevant code:** `backend/src/controllers/message-controller.ts`, message query using `skip` and `limit`; `frontend/src/app/utils/messageApi.ts`, page-based query handling.

**Proposed direction:** use cursor pagination based on a stable `(createdAt, _id)` pair, or another monotonic server-side cursor. Add tests where messages arrive between page requests.

### Finding 8: Socket-based conversation creation does not verify that the recipient exists

**Status: confirmed.**

The REST conversation-creation endpoint checks the users collection. The Socket.IO `recipientId` path only checks ObjectId validity before potentially creating a conversation.

An authenticated client can therefore create a conversation referencing a valid-looking but nonexistent user ID.

**Relevant code:** `backend/src/socket/handlers.ts`, `resolveConversation`; compare with `backend/src/controllers/message-controller.ts`, `createConversation`.

**Proposed direction:** query the users collection before creating a conversation, or make Socket.IO call a shared get-or-create service used by REST and sockets. Handle duplicate-key races consistently.

### Finding 9: Conversation creation has a duplicate-key race

**Status: confirmed design risk.**

Both REST and Socket.IO use a read-then-create pattern for a canonical participant pair:

```text
findOne(participantsKey)
if not found: create(...)
```

Two simultaneous requests can both observe no conversation and race to create it. The unique index prevents two durable records, but the losing request currently falls into the generic error path rather than retrieving the record created by the winner.

**Relevant code:** `backend/src/controllers/message-controller.ts`, `createConversation`; `backend/src/socket/handlers.ts`, `resolveConversation`; unique `participantsKey` in `backend/src/models/Conversation.ts`.

**Proposed direction:** use an atomic upsert with `$setOnInsert`, or catch duplicate-key errors and re-read the canonical conversation. Centralize this logic.

### Finding 10: REST helpers convert failures into successful empty results

**Status: confirmed.**

`getConversations` catches errors and returns `[]`. `getConversationMessages` catches errors and returns an empty page. This means React Query receives a resolved promise and generally cannot expose the failure through `isError`.

Users may see “no conversations” or an empty thread during an outage instead of a retry/error state.

**Relevant code:** `frontend/src/app/utils/messageApi.ts`.

**Proposed direction:** log if useful, then rethrow. Let React Query manage error state and retries. Use an explicit empty result only for a successful response containing no data.

### Finding 11: REST pagination parameters are not sufficiently bounded

**Status: confirmed.**

The history endpoint parses `limit` and `page`, but does not enforce a safe maximum or reject invalid negative values. A caller can request an excessively large page or malformed pagination state.

**Relevant code:** `backend/src/controllers/message-controller.ts`, pagination parsing.

**Proposed direction:** clamp `limit` to a small maximum, require positive integers, and return `400` for invalid values.

### Finding 12: Image input validation is shallow

**Status: confirmed.**

The socket handler checks only that `images` is an array of strings and contains no more than eight entries. It does not validate URL length, format, ownership, or whether the referenced asset is actually available to the current user.

This can create oversized documents or allow arbitrary external references, depending on how the frontend renders them.

**Relevant code:** `backend/src/socket/handlers.ts`, image filtering; `backend/src/models/Message.ts`, image field.

**Proposed direction:** define the image contract explicitly. Prefer server-issued upload references, validate allowed formats and lengths, and enforce the same rules on REST and socket paths.

### Finding 13: Read operations are optimistic and have weak failure handling

**Status: confirmed.**

The frontend immediately sets the conversation unread count to zero after emitting `message:read`, without waiting for the acknowledgement or checking whether the REST fallback succeeds.

If the server update fails, the UI can remain marked read until a later refetch. The server also marks every message in the conversation as read by the current user, including messages sent by that user, which is harmless but unnecessarily broad.

**Relevant code:** `frontend/src/app/hooks/useMessages.ts`, `markAsRead`; `backend/src/socket/handlers.ts`, `handleMessageRead`; REST equivalent in `message-controller.ts`.

**Proposed direction:** acknowledge read operations, reconcile failure, and restrict the update to messages sent by the other participant if that matches the product semantics.

### Finding 14: Presence is correct for one process but not horizontally scalable

**Status: confirmed and documented as a current limitation.**

Presence is stored in process memory and Socket.IO rooms are local to the process. With multiple backend instances, a user connected to instance A will not necessarily appear online to a user connected to instance B, and room broadcasts will not reach all instances.

**Relevant code:** `backend/src/socket/presence.ts`; Socket.IO initialization in `backend/src/socket/index.ts`.

**Proposed direction:** either explicitly enforce single-instance deployment for this feature or add a shared Socket.IO adapter and shared presence store, typically Redis. Presence should remain best-effort even after that.

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
