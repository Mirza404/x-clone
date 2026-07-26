import rateLimit from 'express-rate-limit';

// Free-tier host, no budget for abuse: cap per-IP request rate.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Tighter cap on writes that hit Cloudinary/Mongo (post + message creation).
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
