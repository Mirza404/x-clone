import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';

const loadTestBypassActive =
  process.env.LOAD_TEST_DISABLE_RATE_LIMITS === 'true' &&
  process.env.NODE_ENV !== 'production';

const passThrough: RequestHandler = (_req, _res, next) => next();

if (loadTestBypassActive) {
  console.warn(
    'LOAD_TEST_DISABLE_RATE_LIMITS is active: apiLimiter, writeLimiter, ' +
      'and mediaLimiter are disabled. Use this only for local k6 load testing.'
  );
}

export const apiLimiter: RequestHandler = loadTestBypassActive
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const writeLimiter: RequestHandler = loadTestBypassActive
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 60,
      standardHeaders: true,
      legacyHeaders: false,
    });

export const mediaLimiter: RequestHandler = loadTestBypassActive
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    });
