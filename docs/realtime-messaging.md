# Realtime messaging

## Client flow

`SocketProvider` owns one Socket.IO client for the authenticated browser session. The client asks for a fresh backend token whenever Socket.IO connects or reconnects.

`useConversations` reads conversation summaries through HTTP and keeps them in React Query. A single cache bridge applies incoming summary changes so multiple components do not register duplicate socket listeners.

`useMessages` loads message history through cursor pagination. A send inserts an optimistic message, emits `message:send`, and waits up to ten seconds for an acknowledgement. A successful acknowledgement replaces the optimistic entry. A failed or missing acknowledgement marks it as failed.

Read receipts use `message:read`. If the socket is unavailable or does not acknowledge the event, the frontend uses the HTTP endpoint and then reconciles the cache.

## Server flow

The Socket.IO authentication middleware verifies the JWT and stores the user id on the socket. Each authenticated socket joins a room named for that user.

`message:send` validates content, the client id, media ownership, and the conversation or recipient. New conversations are created when a valid recipient is supplied. Message creation uses the sender and client id as an idempotency pair. The conversation summary and unread count are updated before `message:new` is sent to both user rooms.

`message:read` verifies membership, updates unread state, records the reader on matching messages, and notifies the other participant.

The socket rate limiter is scoped to a socket rather than a source IP. The HTTP mutation limiter remains scoped to source IP.

## Recovery behavior

Socket events make the interface responsive, but MongoDB remains authoritative. After reconnection the frontend refetches active message data. HTTP reads also provide initial state and pagination, so a missed event does not permanently corrupt the browser cache.

Presence and rooms are currently stored in one backend process. Running multiple backend instances requires a shared Socket.IO adapter and a shared presence strategy.

See [MESSAGING_FLOW_REVIEW.md](../MESSAGING_FLOW_REVIEW.md) for the full audit and [WEBSOCKET_MESSAGING_PLAN.md](../WEBSOCKET_MESSAGING_PLAN.md) for the original implementation plan.
