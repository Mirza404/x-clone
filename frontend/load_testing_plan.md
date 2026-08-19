# Load Testing Plan: X-Clone Messaging (WebSocket) Scale Test

## Goal

Determine the real-world breaking point of the current monolithic messaging
feature (Socket.io based) when deployed on Render's free tier, and use the
findings to evaluate whether splitting messaging into its own service is
actually justified for this app's scale, rather than assuming it based on
general "microservices are better" advice.

## Prerequisites

- Messaging flow code review fully completed and merged.
- Confirm current Render free tier limits (memory, concurrent connections,
  idle spin-down behavior) documented before testing, as a baseline.
- Local machine (2024-era, still solid) used as the load generator, since
  self-hosted k6 avoids any cloud testing cost entirely.

## Tooling

- **k6** (open source, self-hosted, free) chosen over Locust for this test
  due to more mature native WebSocket support and JavaScript scripting,
  which fits naturally with the existing Next.js/Express/TypeScript stack.
- Scripts live in [`load-test/k6/`](../load-test/k6/) at the repo root:
  `ws-messaging.js` (Socket.io messaging) and `rest-actions.js` (plain HTTP
  app actions, e.g. liking a post) — kept as two separate suites so a
  failure in one reads as a specific subsystem (WebSocket infra vs. the
  app's own REST/DB path), not "the app broke." See
  [`load-test/k6/README.md`](../load-test/k6/README.md) for exact run
  commands and env vars.
- Auth: both suites run against **pre-signed JWTs**, not real logins.
  `backend/scripts/load-test/seed-and-mint.ts` (`npm run loadtest:seed` in
  `backend/`) seeds N test users and mints tokens signed with
  `BACKEND_JWT_SECRET` directly, matching what `requireAuth` /
  `socketAuthMiddleware` verify. Chosen over real per-VU logins so the
  messaging suite's numbers aren't muddied by login-endpoint load, and over
  a single reused token because that wouldn't exercise per-user/per-socket
  behavior realistically.
- Rate limiting: `apiLimiter`/`writeLimiter` in
  `backend/src/middleware/rate-limit.ts` key **per source IP** by default,
  which means k6 running from one machine hits the app's own 60-req/15min
  write ceiling almost immediately — before any real concurrency signal.
  Start the backend with `LOAD_TEST_DISABLE_RATE_LIMITS=true npm run dev`
  (gated to non-production `NODE_ENV`, logs a `console.warn` when active)
  to bypass this for the REST suite's Phase 2-4 runs. The WS suite doesn't
  need this — `message:send` is rate-limited per-socket
  (`backend/src/socket/rate-limit.ts`), not per-IP, so it isn't affected.
  A nonzero `like_rate_limited_429` metric during a REST run means the
  bypass wasn't set — don't trust the rest of that run's numbers.
- Render free-tier cold start: before any timed phase, both scripts fire a
  few warm-up GET requests against the backend and wait for them to
  succeed, so cold-start latency doesn't contaminate Phase 1's baseline
  reading. (A cleaner fix — running the app/code capacity tests against a
  temporary paid Render instance to remove the free-tier spin-down
  variable entirely, and testing Render's free-tier spin-down behavior as
  its own separate short smoke test — is parked as a next iteration, not
  built yet.)
- MongoDB: this suite's primary runs use a **local MongoDB** instance, not
  the free-tier Atlas cluster, so Atlas's connection cap and storage
  ceiling don't get conflated with Render's or the app's own limits. Plan
  a shorter confirmation run against the real Atlas free tier afterward to
  check whether Atlas becomes the wall before Render does — local-only
  testing skips that failure mode entirely, so it can't be the final word.
- Numeric pass/fail thresholds (e.g. p95 latency, acceptable drop/error
  rate) still need to be pinned down before Phase 2 is actually run — not
  yet decided, tracked as a required next step, not an afterthought.

## Test Phases

### Phase 1: Baseline single-connection sanity check

- One simulated user connects via WebSocket, sends/receives messages.
- Confirms the test script and auth/session handling work correctly
  before scaling up.

### Phase 2: Gradual ramp-up

- Start at 10 concurrent simulated users, then 50, then 100, then 250,
  then 500+.
- At each step, simulate realistic behavior: connect, join a
  conversation, send a message every few seconds, occasionally
  disconnect/reconnect.
- Record at each stage: response latency, dropped connections, server
  memory/CPU (via Render dashboard), and the exact point where Render's
  free tier starts throttling, spinning down, or rejecting connections.

### Phase 3: Sustained load

- Hold the load steady at whatever level Phase 2 showed as "comfortable"
  for an extended period (10 to 15 minutes) to check for memory leaks or
  gradual degradation in the monolith over time, not just at peak.

### Phase 4: Failure point documentation

- Push past the comfortable threshold until the app visibly degrades or
  crashes.
- Document exactly what fails first: WebSocket connection limit, memory
  ceiling, CPU, or Render's platform-level caps.

## What This Test Should Answer

1. At what concurrent user count does the current monolithic architecture
   start to struggle, specifically for WebSocket messaging. (Later we will conduct testing for other shit as well)
2. Whether the bottleneck is the app's own code/architecture or simply
   Render's free tier limits (an **important distinction** before concluding
   anything about the architecture itself).
3. Whether, at the scale this app realistically operates at, a separate
   messaging service would provide meaningful benefit, or whether that
   would be premature optimization for a small, non-enterprise project. (My opinion is microservice for websocket is overengineering)
4. A secondary, informal observation: how well an agentic AI-assisted,
   "vibe coded" build of a genuinely complex app (a social media platform)
   holds up under real load testing, as a proxy for how reliable this
   development approach is for non-trivial systems.

## Notes

- Re-run this same test after any architecture change made in response to
  findings, to confirm improvement is real and not assumed.

## Phase 2 Results (2026-08-19, local run)

Both suites ran to completion against a locally-run backend
(`localhost:3001`, one Node process, `LOAD_TEST_DISABLE_RATE_LIMITS=true`).
**This was not a Render run.** No Render dashboard, no Render CPU/memory
graph, no Render spin-down behavior was observed. Everything below is
local-machine + local-network capacity, plus one cloud dependency
(MongoDB Atlas, see the headline finding). Treat every number as "what this
app and this database do under load," not "what Render's free tier can
survive" — the plan's original Phase 2 design assumed the latter, and this
run cannot answer that part.

One environment gap worth flagging before the numbers: the plan's own
"Tooling" section calls for a **local MongoDB** instance for these runs.
The environment this test actually ran in only had a MongoDB Atlas
connection string in `backend/.env` (`cluster0.vexrhsl.mongodb.net`) — no
local `mongod` was available. So this run mixes "local app server" with
"cloud database," not the fully-local setup the plan describes. That
mismatch means the run cannot distinguish an Atlas free-tier ceiling from
the application's Mongo connection-pool and write-contention behavior.

A second methodology gap changes how the WebSocket numbers must be read. The
run used the seed script's default 20-token pool. At the 500-VU stage,
`ws-messaging.js` reused those identities, creating 25 sockets per account
and concentrating all sends onto 10 paired conversation documents. This was
a valid hot-document stress test, but it was **not 500 simulated users** and
cannot establish a per-user capacity ceiling. The script now rejects a token
pool smaller than the phase's maximum VU count so future runs do not silently
repeat this topology.

### Headline finding: the database path was the first observable bottleneck

Immediately after the WS-messaging ramp finished (500 sockets, 51k+ message
send attempts over 16 minutes), `GET /api/post` — a plain, unauthenticated,
un-rate-limited read — started hanging indefinitely. Isolating it:

- `GET /` (no DB access, plain Express 404) answered instantly. Express
  itself, and the Node process, stayed up and responsive.
- `GET /api/post` (a Mongoose query) hung with no response and no error
  logged. Not a crash, not a thrown exception — a silent stall on the DB
  path specifically.
- A bounded recovery check (polling every ~10s for about 7 minutes,
  17:23:32-17:30:22) never got a `200` back. One earlier in-flight request
  (issued right as the ramp ended) did eventually complete, but only after
  roughly 10 minutes — meaning queries were queuing, not erroring, which
  is consistent with queued database work. The observation alone does not
  distinguish application-side pool exhaustion, hot-document contention,
  or an Atlas free-tier capacity limit.
- The backend's own console log had zero errors, crashes, or Mongoose
  disconnect messages during this entire window — consistent with requests
  queuing silently rather than failing loudly.
- The only fix that worked was killing and restarting the backend process
  (fresh Mongo connection). It came back healthy within seconds and stayed
  healthy through the entire REST Phase 2 run that followed.

**Read on this**: the first visible failure was on the database path while
Express and Socket.io remained responsive. This run does not prove whether
the limiting factor was Atlas itself or the application's behavior under a
highly concentrated write workload. It is also **not** evidence about
Render's capacity — Render was not involved. Repeat against local MongoDB
with one identity per VU, then run a shorter Atlas comparison before
assigning the bottleneck to either the application or the database tier.

### WS-messaging suite (`ws-messaging.js`, PHASE=2)

Ramp 10 -> 50 -> 100 -> 250 -> 500 VUs over 16 minutes (2m/3m/3m/3m/5m
stages), each VU messaging a paired partner every 2-6s.

| Metric                                               | Result                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `ws_sessions`                                        | 687 (0.69/s)                                                 |
| `ws_messages_sent`                                   | 51,121 (51.6/s)                                              |
| `ws_connect_latency`                                 | avg 10.8ms, p90 18ms, p95 52.7ms, max 257ms                  |
| Ack responses received                               | 12,775 of 51,121 sends (25.0%)                               |
| Rejected acknowledgements                            | 0 of the 12,775 responses received                           |
| `ws_message_ack_latency`                             | avg **57.5s**, med 4.4s, p90 3m27s, **p95 4m29s**, max 5m45s |
| `ws_session_duration`                                | avg 3m32s, p95 9m0s                                          |
| `ws_unexpected_disconnects` / `ws_connection_errors` | 0 (metric never incremented)                                 |
| Backend memory after run                             | ~1.36 GB RSS (single Node process)                           |

Connections themselves stayed open through the ramp, but the original
instrumentation did not support a claim of zero failed sends. It recorded
`ws_ack_failure_rate` only when an ack arrived, with no timeout or accounting
for pending sends on shutdown. Only 12,775 of 51,121 sends produced an
observed ack before the run ended; the remaining 38,346 may have been queued,
dropped, or acknowledged after their VU stopped. The p95 latency therefore
describes only received acks, not all sends. The script now applies the same
10-second acknowledgement deadline as the frontend and records received,
timed-out, and abandoned acknowledgements separately.

Three VUs also hit `InvalidStateError` when a timer called `socket.send` on a
closing socket. The script now cancels its initial-send timer, marks the
session disconnected before cleanup, and checks `readyState` before sending.

### REST actions suite (`rest-actions.js`, PHASE=2)

Ramp 10 -> 50 -> 100 -> 250 -> 500 -> 0 VUs over 10 minutes, each VU
repeatedly calling `POST /api/post/like`. Ran on a freshly restarted
backend (see headline finding above) with rate limits disabled and
confirmed at 0 throughout.

| Metric                      | Result                                                              |
| --------------------------- | ------------------------------------------------------------------- |
| `like_success_rate`         | 100.00% (26,633 of 26,633)                                          |
| `like_rate_limited_429`     | 0 (bypass confirmed active)                                         |
| `http_req_failed`           | 0.00% (0 of 26,637)                                                 |
| `like_latency_ms`           | avg 1.55s, min 72ms, med 1.04s, p90 3.96s, **p95 4.34s**, max 6.03s |
| Throughput                  | 43.7 req/s sustained across the ramp                                |
| k6 threshold `p(95)<2000ms` | **failed** (actual p95 4.34s)                                       |
| Backend memory after run    | ~395 MB RSS                                                         |

Zero failures and zero rate-limit rejections end to end — the write path
itself (Mongoose update + Express route) never broke under 500 concurrent
VUs. But it was not fast: median latency crossed 1 second and p95 crossed
4 seconds, well past the 2-second threshold set for this run. Backend
console log was clean throughout (no errors, no crash signatures), and
unlike the WS suite, the backend stayed responsive to plain reads the
entire time — this suite's write volume (26,633 single-document updates)
was far lighter than the WS suite's 51,121 send attempts. At least 12,775
WS sends are confirmed persisted by their acknowledgements; the original
metrics cannot prove how many of the remaining attempts became message
inserts.

### Answering the plan's four questions, as far as a local run can

1. **Where does it start to struggle?** The REST suite exceeded its 2s p95
   target during the 250-500 VU stages. The WS suite accumulated a large ack
   backlog and left the database path unresponsive after the ramp, but the
   reused identities and missing ack-timeout accounting prevent assigning a
   reliable concurrent-user threshold from this run.
2. **App code/architecture vs. platform limits?** This run cannot speak to
   Render's own platform limits at all (no Render involved), and it also
   cannot separate Atlas limits from application-side connection pooling or
   contention on 10 hot conversation documents. It does show that the Node
   process and established sockets stayed alive while database work queued.
3. **Does a separate messaging service look justified?** Nothing here
   supports it. Splitting messaging into its own service without addressing
   the shared database path, backpressure, and hot-document contention would
   not address the bottleneck observed in this run.
4. **Informal reliability signal:** the hand-written Socket.io framing and
   auth path established the intended connections, and the REST mutation
   path returned every response. The WS delivery result remains
   inconclusive because 75% of sends had no observed ack and the workload
   concentrated 500 sockets onto 20 accounts.

### Caveats

- Local machine + local network only. No Render dashboard, no Render
  memory/CPU numbers, no Render free-tier spin-down behavior was observed
  or can be inferred from this run.
- Database was MongoDB Atlas (free tier), not local Mongo as the plan's
  "Tooling" section specifies — this run cannot cleanly separate "the
  app's own DB usage pattern" from "Atlas's specific free-tier ceiling."
  The dedicated Atlas-vs-local confirmation run flagged elsewhere in this
  plan becomes more important in light of this result, not less.
- The WS token pool contained 20 identities, so the 500-VU stage measured
  many sockets sharing a small number of accounts and conversations. Repeat
  with at least one token per VU before describing the result as a
  concurrent-user capacity test.
- Numeric pass/fail thresholds were not pinned down before this run (still
  an open item from the "Tooling" section); the `p(95)<2000ms` threshold
  used here was the script's existing default, not a value this plan
  formally agreed on.
