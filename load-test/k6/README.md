# k6 Load Testing Suite

This directory holds x-clone's k6 load tests. Each suite targets a
different part of the stack, kept separate on purpose: a failure in one
suite should point at a specific subsystem, not the whole app. See
[`frontend/load_testing_plan.md`](../../frontend/load_testing_plan.md) for
the full plan both suites' phases mirror.

## Shared setup

Both suites read a pool of pre-signed JWTs from `load-test/tokens.json`
(repo root), produced by `backend/scripts/load-test/seed-and-mint.ts`
(`npm run loadtest:seed` from `backend/`, `npm run loadtest:seed:wipe` to
clean up). Contract:

```json
[
  {
    "userId": "<mongo ObjectId string>",
    "email": "user@example.com",
    "token": "<jwt>"
  }
]
```

If `load-test/tokens.json` doesn't exist yet, either suite fails
immediately at script load with a clear error from k6's `open()`.

Both suites take `-e BASE_URL=...` (default `http://localhost:3001`) and
`-e PHASE=1|2|3|4` selecting which `options.scenarios` entry gets built —
only one phase runs per `k6 run` invocation. Both fire a short plain-HTTP
warm-up before any timed phase, to burn off Render free-tier cold-start
latency so it doesn't contaminate Phase 1's baseline reading.

---

## WebSocket messaging suite (`ws-messaging.js`)

Tests the Socket.io messaging feature.

### Before you run this

Read the big comment block at the top of `ws-messaging.js` first. Short
version: the backend uses Socket.io, not raw WebSocket. Socket.io runs its
own handshake and packet framing (Engine.IO v4 + Socket.IO protocol v4) on
top of the WS connection. k6 has no built-in Socket.io client, so this
script implements that framing by hand.

**This framing has not been verified against a live backend + MongoDB** in
the environment that wrote it (no server was available to test against
end-to-end). It was written from the documented Engine.IO v4 / Socket.IO v4
wire protocol, matches published k6 + Socket.io load-test patterns, and the
code paths are internally consistent - but "should work" is not "verified
working." **Run Phase 1 against a real local backend before trusting any
other number this script produces.** A failed handshake shows up as
`ws_connection_errors` incrementing and/or the Phase 1 result printing
`FAIL` with `connected=false` - not as a silent zero.

### Requirements

- [k6](https://k6.io/) installed, with `k6/experimental/websockets` and
  `k6/experimental/timers` available (current k6 releases ship both).
- `load-test/tokens.json` with an even number of entries, at least 2 — VUs
  are paired up (even/odd index) to message each other, and Phase 1 uses
  entry 0 as sender / entry 1 as recipient. An odd count leaves one VU
  without a reciprocal partner (it sends but nobody replies), so
  `pickPartner` throws rather than silently skewing the stats.
  `getOrCreateConversation` (see
  `backend/src/services/conversation-service.ts` via
  `backend/src/socket/handlers.ts`) creates the conversation on first send,
  matching real client behavior — no pre-existing conversation ids needed.

### Running a phase

```bash
# from load-test/k6/
k6 run -e PHASE=1 ws-messaging.js

# against a deployed backend, with a non-default token file location
k6 run -e PHASE=1 -e BASE_URL=https://your-app.onrender.com -e TOKENS_FILE=/abs/path/tokens.json ws-messaging.js
```

| Phase | Env var   | What it does                                                                                                                                                                                                                                                              |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `PHASE=1` | 1 VU, 1 iteration. Connect, send one message, confirm ack `ok:true`, confirm the connection stays open. Prints an explicit `PASS`/`FAIL` block. Run this first, always.                                                                                                   |
| 2     | `PHASE=2` | Ramp 10 → 50 → 100 → 250 → 500 VUs (fixed stage durations in the script). Each VU connects, messages a paired partner every 2-6s, and occasionally disconnects/reconnects.                                                                                                |
| 3     | `PHASE=3` | Sustained load: `SUSTAINED_VUS` VUs (default 100) held for `SUSTAINED_DURATION` (default `12m`). Set `SUSTAINED_VUS` to whatever Phase 2 showed as "comfortable."                                                                                                         |
| 4     | `PHASE=4` | Same connect/send/reconnect pattern as Phase 2, but stages keep climbing past a comfortable ceiling, up to `PHASE4_MAX_VUS` (default 750), and hold there to observe the failure mode. Raise `PHASE4_MAX_VUS` without editing the script if 750 isn't enough to break it. |

`PHASE` defaults to `1` if omitted; an unrecognized value throws before any
VU starts.

### Other env vars

| Var                                         | Default                 | Meaning                                                                                                                                                                                                                                                               |
| ------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_URL`                                  | `http://localhost:3001` | Backend origin. WS URL is derived from this (`http`→`ws`, `https`→`wss`) plus `/socket.io/?EIO=4&transport=websocket`.                                                                                                                                                |
| `TOKENS_FILE`                               | `../tokens.json`        | Path to the token file, resolved relative to this script's own location (so it works the same whether you `cd load-test/k6 && k6 run ws-messaging.js` or run it from elsewhere) — not the current working directory. Pass an absolute path to sidestep that entirely. |
| `WARMUP_PATH`                               | `/api/post`             | Lightweight GET hit a few times before real load starts. No dedicated `/health` route exists in `backend/src/app.ts`; `GET /api/post` (`backend/src/routes/post-routes.ts`, mounted at `/api/post` — see `backend/src/routes/index.ts`) is unauthenticated and cheap. |
| `MSG_MIN_INTERVAL_S` / `MSG_MAX_INTERVAL_S` | `2` / `6`               | Randomized delay range between messages per connected VU (phases 2-4).                                                                                                                                                                                                |
| `RECONNECT_PROBABILITY`                     | `0.05`                  | Chance, checked every `RECONNECT_CHECK_INTERVAL_S`, that a VU deliberately drops and re-establishes its connection (simulates a flaky client).                                                                                                                        |
| `RECONNECT_CHECK_INTERVAL_S`                | `45`                    | How often (seconds) the reconnect roll happens.                                                                                                                                                                                                                       |
| `SUSTAINED_VUS`                             | `100`                   | Phase 3 only: concurrent VUs held for the whole sustained window.                                                                                                                                                                                                     |
| `SUSTAINED_DURATION`                        | `12m`                   | Phase 3 only: how long to hold `SUSTAINED_VUS`.                                                                                                                                                                                                                       |
| `PHASE4_MAX_VUS`                            | `750`                   | Phase 4 only: the ceiling the ramp climbs to and holds at.                                                                                                                                                                                                            |

### Metrics to watch

Custom metrics, in addition to k6's built-in `ws_*`/`http_req_*` metrics
(the warm-up step uses plain `k6/http`, so it reports separately):

- `ws_connect_latency` (Trend, ms) — time from opening the raw WS
  connection to receiving the Socket.IO CONNECT ack (i.e. successful auth
  through `socketAuthMiddleware`).
- `ws_message_ack_latency` (Trend, ms) — round trip from emitting
  `message:send` to receiving its `43<id>[...]` ack.
- `ws_ack_failure_rate` (Rate) — fraction of acks where `ok` was not
  `true` (includes rate-limit rejections from the socket-side `allow()`
  limiter in `backend/src/socket/rate-limit.ts`, at 20 events / 10s per
  socket — expect this to climb at high VU counts if messages are sent
  faster than that per connection, which is intentional signal, not a bug
  in the script).
- `ws_unexpected_disconnects` (Counter) — close events not initiated by
  the script's own reconnect-simulation logic. This is the metric most
  directly answering "where does Render's free tier start dropping
  connections."
- `ws_connection_errors` (Counter) — transport-level WS errors or a
  Socket.IO `CONNECT_ERROR` packet (e.g. bad/expired token).
- `ws_messages_sent` (Counter) — total `message:send` emits, for
  sanity-checking throughput against the interval settings above.

These map directly to the plan's "What This Test Should Answer" section:
connect latency and ack failure rate distinguish app-level bottlenecks from
platform limits, and unexpected disconnects mark the point Render's free
tier stops holding connections open.

---

## REST actions suite (`rest-actions.js`)

Tests plain HTTP app actions — currently `POST /api/post/like`
(`backend/src/routes/post-routes.ts`, mounted at `/api/post` per
`backend/src/routes/index.ts`, handled by `toggleLike` in
`backend/src/controllers/post-controller.ts`). Kept separate from the
WebSocket suite so a failure here reads as "the app itself" — DB write
contention, Mongoose, Express — rather than "WebSocket infra."

### Required backend setup

`backend/src/middleware/rate-limit.ts` rate-limits `apiLimiter` (300
req/15min) and `writeLimiter` (60 req/15min) **per source IP**. k6 runs
from one machine, so every simulated VU shares one IP — without disabling
these limits, Phase 2-4 results measure the rate limiter's ceiling, not
real app concurrency.

Start the backend with:

```
LOAD_TEST_DISABLE_RATE_LIMITS=true npm run dev
```

`NODE_ENV` must not be `production` for this to take effect. **This is
required for Phase 2, 3, and 4 to produce meaningful concurrency data.**
Phase 1 is a single request, so it is informative either way.

### Post pool

The script does not hardcode post ids. At `setup()` time it calls the
public `GET /api/post` and builds a pool of real post ids from the
response (`{ posts: [{ id, ... }], totalPages, currentPage }`). Seed the
database with at least a few posts before running any phase (`npm run
seed` in `backend/` covers this).

### Running each phase

All commands run from the repo root (adjust the path if run from
elsewhere) with the backend already up:

```
# Phase 1 — single VU, single call, sanity check (works with or without rate-limit bypass)
k6 run -e PHASE=1 -e BASE_URL=http://localhost:3001 load-test/k6/rest-actions.js

# Phase 2 — ramp 10 -> 50 -> 100 -> 250 -> 500 VUs
k6 run -e PHASE=2 -e BASE_URL=http://localhost:3001 load-test/k6/rest-actions.js

# Phase 3 — sustained hold, default 100 VUs for 12 minutes
k6 run -e PHASE=3 -e SUSTAINED_VUS=100 -e SUSTAINED_DURATION=12m load-test/k6/rest-actions.js

# Phase 4 — push past the comfortable ceiling, default top-end 750 VUs
k6 run -e PHASE=4 -e PHASE4_MAX_VUS=750 -e PHASE4_HOLD_DURATION=3m load-test/k6/rest-actions.js
```

Env vars, all optional:

| Var                    | Default                 | Applies to | Meaning                                                  |
| ---------------------- | ----------------------- | ---------- | -------------------------------------------------------- |
| `BASE_URL`             | `http://localhost:3001` | all        | Backend under test                                       |
| `TOKENS_FILE`          | `../tokens.json`        | all        | Path to the pre-signed token pool                        |
| `PHASE`                | `1`                     | all        | Which phase to run: `1`, `2`, `3`, `4`                   |
| `POST_POOL_LIMIT`      | `50`                    | all        | How many posts to fetch in `setup()` for the like pool   |
| `SUSTAINED_VUS`        | `100`                   | Phase 3    | VU count held for the sustained window                   |
| `SUSTAINED_DURATION`   | `12m`                   | Phase 3    | Length of the sustained hold                             |
| `PHASE4_MAX_VUS`       | `750`                   | Phase 4    | Top-end VU target for the push-past-ceiling ramp         |
| `PHASE4_HOLD_DURATION` | `3m`                    | Phase 4    | How long to hold at `PHASE4_MAX_VUS` before ramping down |

### Warm-up

Before any timed phase, `setup()` fires a few plain `GET /api/post`
requests with short delays, same reasoning as the WS suite's warm-up step.

### Metrics: 429 vs 5xx

This is the whole reason this suite is split from the WS suite, so it's
tracked explicitly rather than folded into one generic error rate:

- `like_rate_limited_429` — count of `429` responses. This is
  **this app's own `writeLimiter`** doing its job (or, if
  `LOAD_TEST_DISABLE_RATE_LIMITS` wasn't set correctly, a false signal —
  check this counter first if Phase 2-4 numbers look capped at a suspiciously
  round number).
- `like_infra_errors_5xx_or_timeout` — count of `5xx` responses or
  connection-level failures (`status === 0`, e.g. timeouts). This is
  **Render's infra ceiling**, not the app's own code.
- `like_other_client_errors_4xx` — count of other `4xx` (400/401/404).
  Not a capacity signal — indicates a test/data problem (bad token, stale
  post id) rather than a load-related failure.
- `like_success_rate` — fraction of calls returning `200`.
- `like_latency_ms` — request latency (k6 reports avg/p95/etc. automatically
  in the end-of-run summary for any `Trend` metric).

Read the end-of-run k6 summary for all of the above; no external log
processing needed. If `like_rate_limited_429` is nonzero during Phase 2-4,
the backend was not started with `LOAD_TEST_DISABLE_RATE_LIMITS=true` —
fix that and rerun before trusting the rest of the numbers.
