import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';

// Local k6 load tests run every request from a single machine, so
// express-rate-limit's default per-IP keying makes every real limiter reject
// requests past its window budget almost immediately. This bypass lets a
// load test opt out of rate limiting entirely, gated hard behind a
// non-production NODE_ENV so it can never take effect in a real deployment.
const loadTestBypassActive =
  process.env.LOAD_TEST_DISABLE_RATE_LIMITS === 'true' &&
  process.env.NODE_ENV !== 'production';

const passThrough: RequestHandler = (_req, _res, next) => next();

if (loadTestBypassActive) {
  console.warn(
    'LOAD_TEST_DISABLE_RATE_LIMITS is active: apiLimiter, writeLimiter, ' +
      'and mediaLimiter are disabled (no-op pass-through). This must only ' +
      'ever be set for local k6 load testing, never in a deployed environment.'
  );
}

// Free-tier host, no budget for abuse: cap per-IP request rate.
export const apiLimiter: RequestHandler = loadTestBypassActive
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    });

// Tighter cap on every authenticated HTTP mutation that writes to storage.
export const writeLimiter: RequestHandler = loadTestBypassActive
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 60,
      standardHeaders: true,
      legacyHeaders: false,
    });

// Each image needs one signature request and one completion request. Keep
// those authenticated requests out of the general mutation budget while the
// global API limiter still provides a per-IP ceiling.
export const mediaLimiter: RequestHandler = loadTestBypassActive
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    });
