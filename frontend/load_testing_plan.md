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
