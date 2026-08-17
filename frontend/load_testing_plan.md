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
