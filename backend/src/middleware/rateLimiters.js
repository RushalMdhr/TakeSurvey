import { rateLimit } from 'express-rate-limit';

const fifteenMinutes = 15 * 60 * 1000;

function createRateLimiter({ limit, windowMs, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message },
    skipSuccessfulRequests
  });
}

export const publicResponseRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: fifteenMinutes,
  message: 'Too many responses from this network. Please try again later.'
});

export const loginRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: fifteenMinutes,
  message: 'Too many failed login attempts. Please try again later.',
  skipSuccessfulRequests: true
});

export const registrationRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Too many registration attempts. Please try again later.'
});
