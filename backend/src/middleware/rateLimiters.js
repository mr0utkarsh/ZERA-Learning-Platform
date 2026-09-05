const rateLimit = require('express-rate-limit');

// In the automated test suite hundreds of requests come from one IP;
// rate limiting is disabled there (it's exercised separately in prod config).
const TEST = process.env.NODE_ENV === 'test';
const unlimited = (req, res, next) => next();

const mk = (opts) => (TEST
  ? unlimited
  : rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    ...opts,
  }));

const apiLimiter = mk({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const authLimiter = mk({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { success: false, message: 'Too many authentication attempts, please try again in 15 minutes' },
});

const otpLimiter = mk({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  message: { success: false, message: 'Too many OTP requests, please try again later' },
});

const aiLimiter = mk({
  windowMs: 60 * 1000,
  limit: 15,
  message: { success: false, message: 'AI request limit reached, please wait a minute' },
});

module.exports = { apiLimiter, authLimiter, otpLimiter, aiLimiter };
