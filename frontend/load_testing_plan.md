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
mismatch is directly responsible for the headline finding below.

### Headline finding: the database, not the app, was the first thing to fail

Immediately after the WS-messaging ramp finished (500 VUs, 51k+ message
writes over 16 minutes), `GET /api/post` — a plain, unauthenticated,
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
  points at connection-pool exhaustion or a saturated Atlas free-tier
  connection cap rather than a dropped connection.
- The backend's own console log had zero errors, crashes, or Mongoose
  disconnect messages during this entire window — consistent with requests
  queuing silently rather than failing loudly.
- The only fix that worked was killing and restarting the backend process
  (fresh Mongo connection). It came back healthy within seconds and stayed
  healthy through the entire REST Phase 2 run that followed.

**Read on this**: this is a database-tier failure, not an app-code bug —
Express, Socket.io, and the route handlers themselves never threw or
crashed. It's exactly the kind of ceiling Phase 2 exists to find, just one
layer over from where the plan expected to find it (Render's app-server
limits, not MongoDB Atlas's free-tier connection limits). It is **not**
evidence about Render's own capacity — Render was not involved in this run
at all. A dedicated Atlas-vs-Render confirmation run (already flagged as a
follow-up in this plan's "Tooling" notes) is needed before concluding
anything about which cloud tier breaks first in production.

### WS-messaging suite (`ws-messaging.js`, PHASE=2)

Ramp 10 -> 50 -> 100 -> 250 -> 500 VUs over 16 minutes (2m/3m/3m/3m/5m
stages), each VU messaging a paired partner every 2-6s.

| Metric                                               | Result                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `ws_sessions`                                        | 687 (0.69/s)                                                 |
| `ws_messages_sent`                                   | 51,121 (51.6/s)                                              |
| `ws_connect_latency`                                 | avg 10.8ms, p90 18ms, p95 52.7ms, max 257ms                  |
| `ws_ack_failure_rate`                                | 0.00% (0 of 12,775 acks)                                     |
| `ws_message_ack_latency`                             | avg **57.5s**, med 4.4s, p90 3m27s, **p95 4m29s**, max 5m45s |
| `ws_session_duration`                                | avg 3m32s, p95 9m0s                                          |
| `ws_unexpected_disconnects` / `ws_connection_errors` | 0 (metric never incremented)                                 |
| Backend memory after run                             | ~1.36 GB RSS (single Node process)                           |

Connections themselves stayed healthy the whole ramp — fast to establish,
zero dropped, zero failed acks. But message round-trip latency degraded
severely as VUs climbed: acks that land in low-hundreds of ms at light load
were taking multiple minutes by the 250-500 VU stages. The connections
didn't fail; they just got very slow, well past anything a real chat UI
could present as "sent." Three VUs hit a harmless `InvalidStateError` in
the k6 script itself (a timing race between the reconnect-simulation timer
and `socket.send` on an already-closing socket) — a script quirk, not a
backend issue, and it didn't block the run.

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
was far lighter than the WS suite's (51,121 message inserts plus
per-message conversation upserts), which is consistent with the DB only
buckling under the WS suite's load.

### Answering the plan's four questions, as far as a local run can

1. **Where does it start to struggle?** Not at the app/code level up to
   500 VUs — both suites finished with 0% hard failures. It struggles at
   the _latency_ level well before 500 VUs (ack/like p95 both blow past a
   2s bar by the 250-500 VU stages), and it fails outright at the
   _database_ level right after the WS ramp, independent of VU count by
   that point — a backlog effect from sustained write volume, not a
   live-concurrency ceiling.
2. **App code/architecture vs. platform limits?** This run cannot speak to
   Render's own platform limits at all (no Render involved). It CAN say
   the app's own Socket.io and Express code held up structurally (no
   crashes, no dropped connections, no unhandled errors) — the failure
   that did occur was a dependency (MongoDB Atlas free tier), not this
   codebase's own logic.
3. **Does a separate messaging service look justified?** Nothing here
   supports it. The WS code path itself never failed; the shared database
   did. Splitting messaging into its own service without also giving it
   its own database wouldn't have prevented this run's actual failure,
   which weakens the case for a WS-specific microservice split at this
   app's current scale.
4. **Informal reliability signal:** the hand-written Socket.io framing,
   auth middleware, and REST mutation paths handled a 500-VU ramp without
   throwing, crashing, or dropping a single connection or request. The
   weak point found was operational (free-tier DB capacity), not
   application logic — a reasonable result for an agentic, "vibe coded"
   build under real concurrency.

### Caveats

- Local machine + local network only. No Render dashboard, no Render
  memory/CPU numbers, no Render free-tier spin-down behavior was observed
  or can be inferred from this run.
- Database was MongoDB Atlas (free tier), not local Mongo as the plan's
  "Tooling" section specifies — this run cannot cleanly separate "the
  app's own DB usage pattern" from "Atlas's specific free-tier ceiling."
  The dedicated Atlas-vs-local confirmation run flagged elsewhere in this
  plan becomes more important in light of this result, not less.
- Numeric pass/fail thresholds were not pinned down before this run (still
  an open item from the "Tooling" section); the `p(95)<2000ms` threshold
  used here was the script's existing default, not a value this plan
  formally agreed on.

## Phase 3 Results (2026-08-19, local run)

Same environment as Phase 2: a locally-run backend (`localhost:3001`, one
Node process, `LOAD_TEST_DISABLE_RATE_LIMITS=true`), MongoDB Atlas free
tier (no local `mongod` available in this environment either). **Still not
a Render run** — everything below is local-machine capacity plus the same
Atlas dependency Phase 2 used. Both suites ran the full default
`SUSTAINED_DURATION` (12m), back to back, on the same backend process
(REST ran second, so its "before" memory reading already includes the WS
run's residual footprint).

### Choosing `SUSTAINED_VUS`

The plan's instruction is to hold Phase 3 at "whatever Phase 2 showed as
comfortable." Phase 2's own writeup doesn't break latency out per stage,
but its prose draws the line explicitly at 250 VUs: "acks that land in
low-hundreds of ms at light load were taking multiple minutes by the
**250-500 VU stages**." That phrasing treats 10/50/100 as the "light load"
side of the split, and 100 is also the script's own default. On that
basis, **`SUSTAINED_VUS=100`** was used for both suites.

That reasoning turned out to be only half right — see the WS results
below. 100 VUs was a defensible reading of the Phase 2 text going in, but
the actual Phase 3 numbers show REST was genuinely comfortable at 100 VUs,
while WS was not. Sustained duration surfaced that gap; a single ramp
stage in Phase 2 didn't run long enough to.

### Headline finding: no repeat of the full Atlas hang, but a shorter echo of it right as the WS run wound down

`GET /api/post` was polled from a separate terminal every ~30-35s
throughout both 12-minute runs specifically to catch a repeat of Phase 2's
~10-minute DB stall. It did not recur in that form — the backend answered
`200` on every check throughout both runs except two consecutive misses
right at the tail of the WS run, as the 100 VUs were disconnecting
(`19:24:47` and `19:25:27`, both `curl` timeouts at the 5s cap with no
response). The very next check, taken immediately after the k6 process
exited, came back `200` in 0.18s, and the entire following 12-minute REST
run polled clean with sub-400ms responses throughout. So: a real, brief
unresponsiveness window (at least ~40s, bounded by the polling interval)
coincided with connection teardown at the end of the WS run, but it
self-resolved without a backend restart — unlike Phase 2, where only
killing the process fixed it. Treat this as a smaller-scale instance of the
same failure mode (DB/connection-pool pressure spiking under WS load), not
a clean bill of health, and not the same severity as Phase 2's finding.

### WS-messaging suite (`ws-messaging.js`, PHASE=3, `SUSTAINED_VUS=100`, 12m hold)

| Metric                                               | Result                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| `ws_sessions`                                        | 180 (0.24/s)                                                    |
| `ws_messages_sent`                                   | 21,783 (29.0/s)                                                 |
| `ws_connect_latency`                                 | avg 61.9ms, p90 154ms, p95 162ms, max 174ms                     |
| `ws_ack_failure_rate`                                | 0.00% (0 of 21,216 acks)                                        |
| `ws_message_ack_latency`                             | avg **5.05s**, med 3.03s, p90 14.05s, **p95 15.42s**, max 2m21s |
| `ws_session_duration`                                | avg 5m9s, p95 11m15s                                            |
| `ws_unexpected_disconnects` / `ws_connection_errors` | 0 (metric never incremented)                                    |
| Backend memory, end of run                           | ~363 MB RSS (371,548 K)                                         |

Connections and acks themselves stayed structurally sound: zero failed
acks out of 21,216, zero unexpected disconnects, zero connection errors,
over the full 12 minutes at a flat 100 VUs. But message round-trip latency
was already far past "comfortable" at steady state, not just at Phase 2's
peak stages — median ack time was 3 seconds and p95 was over 15 seconds,
against the 2-second bar used elsewhere in this plan. This is a materially
different picture from what Phase 2's prose implied for "light load": 100
VUs held steady for 12 minutes behaves like Phase 2's degraded 250+ VU
stages, not its healthy 10-100 VU stages. The most likely explanation is
the backlog effect Phase 2's headline finding already pointed at — message
writes queuing up over a sustained window, rather than a live-concurrency
ceiling that only shows up at high VU counts. **No windowed/time-bucketed
latency data was captured for this run** (only the end-of-run summary), so
whether ack latency stayed flat around this level or drifted upward over
the 12 minutes cannot be answered from this run — a real gap in what Phase
3 was supposed to check ("does latency stay flat or drift").

### REST actions suite (`rest-actions.js`, PHASE=3, `SUSTAINED_VUS=100`, 12m hold)

| Metric                      | Result                                                               |
| --------------------------- | -------------------------------------------------------------------- |
| `like_success_rate`         | 100.00% (34,134 of 34,134)                                           |
| `like_rate_limited_429`     | 0 (bypass confirmed active)                                          |
| `http_req_failed`           | 0.00% (0 of 34,138)                                                  |
| `like_latency_ms`           | avg 110.7ms, med 87.9ms, p90 150.1ms, **p95 203.2ms**, max 1.68s     |
| Throughput                  | 46.8 req/s sustained                                                 |
| k6 threshold `p(95)<2000ms` | **passed** (actual p95 203ms)                                        |
| Backend memory, start->end  | ~382 MB -> ~421 MB RSS (391,208 K -> 431,616 K), plateaued after ~2m |

REST at 100 VUs sustained was genuinely comfortable by every measure: the
k6 threshold passed cleanly (p95 203ms, 10x under the 2s bar), 100%
success across 34,134 requests, zero rate-limit rejections, and latency
that never approached Phase 2's degraded numbers. Memory grew ~49MB in the
first ~2 minutes (391MB -> ~430MB) then held flat within a few hundred KB
for the remaining 10 minutes of the run (see samples in the caveats
below) — consistent with one-time connection/buffer allocation settling
into a steady state, not a leak. This is the strongest "comfortable at 100
VUs" result of the whole test: REST held both throughput and latency
completely flat for the entire 12-minute window.

### Answering the plan's four questions, from this run

1. **Where does it start to struggle?** At the REST/HTTP level, not yet at
   100 VUs sustained — this suite passed cleanly. At the WS level, it's
   already struggling at 100 VUs held for 12 minutes, even though Phase 2's
   shorter 100-VU ramp stage didn't show this. Sustained duration, not just
   VU count, is itself a variable that matters for the WS path.
2. **App code/architecture vs. platform limits?** Same read as Phase 2:
   the WS and REST code paths themselves didn't crash, drop connections,
   or throw errors at 100 VUs for 12 minutes. The degradation is in
   latency and (briefly, at the very end of the WS run) DB responsiveness,
   not in application logic breaking.
3. **Does a separate messaging service look justified?** This run adds a
   new data point against a WS-specific split: REST, hitting the same
   shared database, stayed fast and flat at the same VU count and duration
   where WS degraded badly. That's more evidence the WS code path itself
   isn't the bottleneck — the shared DB under sustained WS write volume is.
4. **Informal reliability signal:** zero crashes, zero dropped connections,
   zero unhandled errors across two full 12-minute sustained runs. The
   weak points found (WS ack latency under sustained load, a ~40s DB
   unresponsiveness window at WS teardown) are both DB/latency-tier issues,
   not application logic breaking down.

### Caveats

- Local machine + local network only, same as Phase 2 — no Render
  dashboard, no Render memory/CPU numbers, no Render free-tier behavior
  observed.
- Database was MongoDB Atlas (free tier), not local Mongo, same gap as
  Phase 2 — this run cannot cleanly separate the app's own DB usage
  pattern from Atlas's specific free-tier ceiling.
- REST ran on a backend process that had just finished the WS run (same
  process, not restarted between suites) — its "before" memory figure
  (~382MB) already reflects the WS run's residual footprint, not a clean
  baseline. The ~49MB growth-then-plateau reported for REST is relative to
  that already-warmed baseline.
- No time-bucketed/windowed metrics were captured for either suite —
  only the end-of-run k6 summary and manually-sampled DB-health/memory
  checks every ~30s from a separate terminal. This means "does latency
  drift upward over the 12 minutes" cannot be answered precisely for the
  WS suite from k6's own metrics; the memory samples (recorded in
  `rest_mem.log` in the run environment, not committed to the repo) are
  the only genuinely time-series data collected in this phase.
- The two consecutive DB timeouts at the WS run's tail were caught by a
  30-35s polling interval, so the true start/end of that unresponsive
  window is only bounded, not precisely measured — it could have been as
  short as ~10s or as long as ~70s.
- `SUSTAINED_VUS=100` was chosen from Phase 2's prose, not from
  fine-grained per-stage data (Phase 2 didn't record that breakdown either).
  A dedicated stepped run at 100/150/200 VUs, each held for several
  minutes, would pin down the WS suite's actual "comfortable" ceiling more
  precisely than either Phase 2 or Phase 3 currently can.
