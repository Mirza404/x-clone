/**
 * REST Actions load test — plain HTTP app-action suite.
 *
 * Scope: this suite ONLY exercises plain REST endpoints (currently
 * POST /api/post/like). It is deliberately kept separate from the
 * companion WebSocket messaging suite in this same directory, so a
 * failure here reads as "the app itself" (DB write contention, Mongoose,
 * Express) rather than "WebSocket infra". See ../../frontend/load_testing_plan.md
 * for the overall phase structure this suite mirrors (applied to REST
 * instead of WS).
 *
 * IMPORTANT — rate limiting:
 * backend/src/middleware/rate-limit.ts keys apiLimiter (300 req/15min) and
 * writeLimiter (60 req/15min) per source IP by default. k6 runs from one
 * machine, so every simulated VU shares one IP: without disabling these
 * limits, Phase 2-4 results measure the rate limiter, not real concurrency.
 * Start the backend with:
 *
 *   LOAD_TEST_DISABLE_RATE_LIMITS=true npm run dev   (NODE_ENV must NOT be 'production')
 *
 * for Phase 2/3/4 runs to produce meaningful concurrency data. Phase 1 is a
 * single request, so it's informative either way, but running it with rate
 * limits enabled is still a fine sanity check of that env var's plumbing.
 *
 * Usage:
 *   k6 run -e PHASE=1 load-test/k6/rest-actions.js
 *   k6 run -e PHASE=2 load-test/k6/rest-actions.js
 *   k6 run -e PHASE=3 -e SUSTAINED_VUS=100 -e SUSTAINED_DURATION=12m load-test/k6/rest-actions.js
 *   k6 run -e PHASE=4 -e PHASE4_MAX_VUS=750 load-test/k6/rest-actions.js
 *
 * See ./README.md for the full env var reference.
 */

import http from 'k6/http';
import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Config (all overridable via -e VAR=value on the k6 CLI)
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKENS_FILE = __ENV.TOKENS_FILE || '../tokens.json';
const PHASE = __ENV.PHASE || '1'; // '1' | '2' | '3' | '4'

const SUSTAINED_VUS = parseInt(__ENV.SUSTAINED_VUS, 10) || 100;
const SUSTAINED_DURATION = __ENV.SUSTAINED_DURATION || '12m';

const PHASE4_MAX_VUS = parseInt(__ENV.PHASE4_MAX_VUS, 10) || 750;
const PHASE4_HOLD_DURATION = __ENV.PHASE4_HOLD_DURATION || '3m';

const POST_POOL_LIMIT = parseInt(__ENV.POST_POOL_LIMIT, 10) || 50;

// ---------------------------------------------------------------------------
// Custom metrics
//
// The whole reason this suite exists separately from the WS suite is to
// isolate "the app's own code" failures from "Render's infra ceiling"
// failures. That distinction has to survive into the metrics, not just the
// prose: a 429 here is this app's own writeLimiter doing its job (or, if
// LOAD_TEST_DISABLE_RATE_LIMITS wasn't set, a false signal), while a 5xx/0
// (timeout/connection error) is Render running out of headroom. Collapsing
// both into one generic "error rate" would hide exactly the distinction
// this suite is supposed to make visible.
// ---------------------------------------------------------------------------

const likeLatency = new Trend('like_latency_ms', true);
const likeSuccessRate = new Rate('like_success_rate');
const rateLimited429 = new Counter('like_rate_limited_429'); // this app's writeLimiter
const infraErrors5xxOrTimeout = new Counter('like_infra_errors_5xx_or_timeout'); // Render ceiling
const otherClientErrors = new Counter('like_other_client_errors_4xx'); // 400/401/404 - test/data bugs, not a capacity signal

// ---------------------------------------------------------------------------
// Shared data loaded once at init time, reused across all VUs
// ---------------------------------------------------------------------------

// Contract (owned by a sibling agent's seed script):
// JSON array of { userId, email, token } where `token` is a pre-signed JWT
// valid against this backend's requireAuth (see
// backend/src/middleware/require-auth.ts: signed with BACKEND_JWT_SECRET,
// sub = userId, issuer x-clone-frontend, audience x-clone-backend).
// This file may not exist until that seed script has run - see README.md.
const tokens = new SharedArray('tokens', function () {
  return JSON.parse(open(TOKENS_FILE));
});

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Shared request helper
// ---------------------------------------------------------------------------

function likeOnce(token, postId) {
  // toggleLike (backend/src/controllers/post-controller.ts ~line 486) flips
  // like/unlike per call - repeated calls from load VUs just toggle state
  // back and forth, no accumulation bug to worry about.
  const res = http.post(
    `${BASE_URL}/api/post/like`,
    JSON.stringify({ id: postId }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      tags: { name: 'POST /api/post/like' },
    }
  );

  likeLatency.add(res.timings.duration);
  const ok = res.status === 200;
  likeSuccessRate.add(ok);

  // Status-code bucketing: keep 429 (rate limiter) strictly separate from
  // 5xx/timeout (infra ceiling) and other 4xx (test/data problems).
  if (res.status === 429) {
    rateLimited429.add(1);
  } else if (res.status === 0 || res.status >= 500) {
    infraErrors5xxOrTimeout.add(1);
  } else if (!ok) {
    otherClientErrors.add(1);
  }

  return res;
}

// ---------------------------------------------------------------------------
// setup(): warm-up + real post id pool
//
// Render free-tier cold start is a known confound (same reasoning as the WS
// suite) - a few throwaway GETs with short delays before any timed phase
// starts keeps that latency out of Phase 1's baseline reading.
// ---------------------------------------------------------------------------

export function setup() {
  console.log(`[SETUP] Warming up ${BASE_URL} (Render free-tier cold start mitigation)`);
  for (let i = 1; i <= 3; i++) {
    const res = http.get(`${BASE_URL}/api/post?limit=1`, {
      tags: { name: 'warmup GET /api/post' },
    });
    console.log(`[SETUP] warm-up request ${i}/3 -> status ${res.status}`);
    sleep(2);
  }

  if (tokens.length === 0) {
    throw new Error(
      `[SETUP] "${TOKENS_FILE}" produced 0 tokens. Confirm the seed script has run and TOKENS_FILE points at its output.`
    );
  }

  console.log('[SETUP] Fetching real post ids from GET /api/post');
  const res = http.get(`${BASE_URL}/api/post?limit=${POST_POOL_LIMIT}`, {
    tags: { name: 'setup GET /api/post' },
  });
  if (res.status !== 200) {
    throw new Error(`[SETUP] GET /api/post failed: status ${res.status}, body ${res.body}`);
  }

  let body;
  try {
    body = JSON.parse(res.body);
  } catch (e) {
    throw new Error(`[SETUP] GET /api/post returned non-JSON body: ${res.body}`);
  }

  // allPosts (backend/src/controllers/post-controller.ts) returns
  // { posts: [{ id, content, images, name, createdAt, likes, author, authorImage, comments }], totalPages, currentPage }
  const postIds = (body.posts || []).map((p) => p.id).filter(Boolean);
  if (postIds.length === 0) {
    throw new Error('[SETUP] GET /api/post returned no posts - seed the database before running load tests.');
  }

  console.log(`[SETUP] Loaded ${postIds.length} post id(s) and ${tokens.length} token(s) for the like pool`);
  return { postIds };
}

// ---------------------------------------------------------------------------
// Phase 1: single VU, single iteration, one call, explicit pass/fail
// ---------------------------------------------------------------------------

export function phase1Sanity(data) {
  const tokenEntry = tokens[0];
  if (!tokenEntry) {
    console.error('[PHASE 1 SANITY] FAIL - no tokens loaded from TOKENS_FILE');
    return;
  }
  const postId = data.postIds[0];
  if (!postId) {
    console.error('[PHASE 1 SANITY] FAIL - no post ids fetched in setup()');
    return;
  }

  const res = likeOnce(tokenEntry.token, postId);

  if (res.status === 200) {
    console.log(
      `[PHASE 1 SANITY] PASS - POST /api/post/like -> 200 in ${res.timings.duration.toFixed(0)}ms (post ${postId})`
    );
  } else {
    console.error(
      `[PHASE 1 SANITY] FAIL - POST /api/post/like -> ${res.status}, body: ${res.body}`
    );
  }
}

// ---------------------------------------------------------------------------
// Phases 2-4: ramp / sustained VU action - pick random token + post, like,
// randomized 1-3s think-time to mimic real usage instead of hammering flat out.
// ---------------------------------------------------------------------------

export function restAction(data) {
  const tokenEntry = randomItem(tokens);
  const postId = randomItem(data.postIds);

  likeOnce(tokenEntry.token, postId);

  sleep(1 + Math.random() * 2); // 1-3s think-time
}

// ---------------------------------------------------------------------------
// Scenario selection - one phase per run, chosen via -e PHASE=<1|2|3|4>
// ---------------------------------------------------------------------------

function buildScenarios() {
  switch (PHASE) {
    case '1':
      return {
        phase1_sanity: {
          executor: 'shared-iterations',
          vus: 1,
          iterations: 1,
          maxDuration: '30s',
          exec: 'phase1Sanity',
        },
      };

    case '2':
      // Ramp 10 -> 50 -> 100 -> 250 -> 500, per the plan's Phase 2.
      return {
        phase2_ramp: {
          executor: 'ramping-vus',
          exec: 'restAction',
          startVUs: 0,
          stages: [
            { duration: '1m', target: 10 },
            { duration: '2m', target: 50 },
            { duration: '2m', target: 100 },
            { duration: '2m', target: 250 },
            { duration: '2m', target: 500 },
            { duration: '1m', target: 0 }, // ramp-down
          ],
        },
      };

    case '3':
      return {
        phase3_sustained: {
          executor: 'constant-vus',
          exec: 'restAction',
          vus: SUSTAINED_VUS,
          duration: SUSTAINED_DURATION,
        },
      };

    case '4': {
      // Same ramp shape as Phase 2, but the top end is configurable
      // (PHASE4_MAX_VUS) so the ceiling can be pushed further without
      // editing the script - the goal here is to find the actual failure
      // point, not stop at a pre-agreed "comfortable" number.
      const top = PHASE4_MAX_VUS;
      return {
        phase4_push_past_ceiling: {
          executor: 'ramping-vus',
          exec: 'restAction',
          startVUs: 0,
          stages: [
            { duration: '1m', target: Math.round(top * 0.1) },
            { duration: '2m', target: Math.round(top * 0.3) },
            { duration: '2m', target: Math.round(top * 0.6) },
            { duration: '2m', target: top },
            { duration: PHASE4_HOLD_DURATION, target: top },
            { duration: '1m', target: 0 }, // ramp-down
          ],
        },
      };
    }

    default:
      throw new Error(`Unknown PHASE "${PHASE}" - expected one of "1", "2", "3", "4"`);
  }
}

export const options = {
  scenarios: buildScenarios(),
  // Informational thresholds - none use abortOnFail, since Phase 4 is
  // explicitly meant to run past the comfortable ceiling and fail. These
  // just make pass/fail visible in the end-of-run summary.
  thresholds: {
    like_success_rate: ['rate>0.95'],
    like_latency_ms: ['p(95)<2000'],
    // Rate-limit hits should be non-existent when
    // LOAD_TEST_DISABLE_RATE_LIMITS=true is set correctly for Phase 2-4.
    like_rate_limited_429: ['count==0'],
  },
};
