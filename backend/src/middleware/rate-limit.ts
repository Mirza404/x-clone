import rateLimit from 'express-rate-limit';

// Free-tier host, no budget for abuse: cap per-IP request rate.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter cap on every authenticated HTTP mutation that writes to storage.
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Each image needs one signature request and one completion request. Keep
// those authenticated requests out of the general mutation budget while the
// global API limiter still provides a per-IP ceiling.
export const mediaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
