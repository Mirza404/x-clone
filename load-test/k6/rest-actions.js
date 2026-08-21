import http from 'k6/http';
import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const TOKENS_FILE = __ENV.TOKENS_FILE || '../tokens.json';
const PHASE = __ENV.PHASE || '1';

const SUSTAINED_VUS = parseInt(__ENV.SUSTAINED_VUS, 10) || 100;
const SUSTAINED_DURATION = __ENV.SUSTAINED_DURATION || '12m';

const PHASE4_MAX_VUS = parseInt(__ENV.PHASE4_MAX_VUS, 10) || 750;
const PHASE4_HOLD_DURATION = __ENV.PHASE4_HOLD_DURATION || '3m';

const POST_POOL_LIMIT = parseInt(__ENV.POST_POOL_LIMIT, 10) || 50;

const likeLatency = new Trend('like_latency_ms', true);
const likeSuccessRate = new Rate('like_success_rate');
const rateLimited429 = new Counter('like_rate_limited_429');
const infraErrors5xxOrTimeout = new Counter('like_infra_errors_5xx_or_timeout');
const otherClientErrors = new Counter('like_other_client_errors_4xx');

const tokens = new SharedArray('tokens', function () {
  return JSON.parse(open(TOKENS_FILE));
});

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function likeOnce(token, postId) {
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

  if (res.status === 429) {
    rateLimited429.add(1);
  } else if (res.status === 0 || res.status >= 500) {
    infraErrors5xxOrTimeout.add(1);
  } else if (!ok) {
    otherClientErrors.add(1);
  }

  return res;
}

export function setup() {
  console.log(`[SETUP] Warming up ${BASE_URL}`);
  for (let i = 1; i <= 3; i++) {
    const res = http.get(`${BASE_URL}/api/post?limit=1`, {
      tags: { name: 'warmup GET /api/post' },
    });
    console.log(`[SETUP] warmup request ${i}/3 returned ${res.status}`);
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
    throw new Error(
      `[SETUP] GET /api/post failed: status ${res.status}, body ${res.body}`
    );
  }

  let body;
  try {
    body = JSON.parse(res.body);
  } catch (e) {
    throw new Error(`[SETUP] GET /api/post returned invalid JSON: ${res.body}`);
  }

  const postIds = (body.posts || []).map((p) => p.id).filter(Boolean);
  if (postIds.length === 0) {
    throw new Error(
      '[SETUP] GET /api/post returned no posts. Seed the database before running load tests.'
    );
  }

  console.log(
    `[SETUP] Loaded ${postIds.length} post id(s) and ${tokens.length} token(s) for the like pool`
  );
  return { postIds };
}

export function phase1Sanity(data) {
  const tokenEntry = tokens[0];
  if (!tokenEntry) {
    console.error('[PHASE 1 SANITY] FAIL: no tokens loaded from TOKENS_FILE');
    return;
  }
  const postId = data.postIds[0];
  if (!postId) {
    console.error('[PHASE 1 SANITY] FAIL: no post ids fetched in setup()');
    return;
  }

  const res = likeOnce(tokenEntry.token, postId);

  if (res.status === 200) {
    console.log(
      `[PHASE 1 SANITY] PASS: POST /api/post/like returned 200 in ${res.timings.duration.toFixed(0)}ms (post ${postId})`
    );
  } else {
    console.error(
      `[PHASE 1 SANITY] FAIL: POST /api/post/like returned ${res.status}, body: ${res.body}`
    );
  }
}

export function restAction(data) {
  const tokenEntry = randomItem(tokens);
  const postId = randomItem(data.postIds);

  likeOnce(tokenEntry.token, postId);

  sleep(1 + Math.random() * 2);
}

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
            { duration: '1m', target: 0 },
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
            { duration: '1m', target: 0 },
          ],
        },
      };
    }

    default:
      throw new Error(
        `Unknown PHASE "${PHASE}". Expected one of "1", "2", "3", "4"`
      );
  }
}

export const options = {
  scenarios: buildScenarios(),
  thresholds: {
    like_success_rate: ['rate>0.95'],
    like_latency_ms: ['p(95)<2000'],
    like_rate_limited_429: ['count==0'],
  },
};
