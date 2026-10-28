import { env } from '../config/env.js';

// Fixed-window, in-memory rate limiter. Sufficient for a single-node deployment.
// For multi-node deployments, replace the store with a Redis-backed implementation.
const stores = new Map();

function getClientIdentifier(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? String(forwarded).split(',')[0].trim() : (req.ip || req.connection.remoteAddress || 'unknown');
  return ip;
}

function windowKey(identifier, route) {
  return `${route}:${identifier}`;
}

function nowMs() {
  return Date.now();
}

export function createRateLimiter({ windowMs, maxRequests }) {
  return function rateLimiter(req, res, next) {
    const identifier = getClientIdentifier(req);
    const key = windowKey(identifier, req.route ? req.route.path : req.path);
    const now = nowMs();

    let record = stores.get(key);

    if (!record || record.resetAt <= now) {
      record = { count: 0, resetAt: now + windowMs };
      stores.set(key, record);
    }

    record.count += 1;

    const remaining = Math.max(0, maxRequests - record.count);
    const retryAfter = Math.max(0, Math.ceil((record.resetAt - now) / 1000));

    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter
      });
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20
});

export const strictAuthRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5
});

export const oauthRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10
});

export function pruneStaleStores() {
  const now = nowMs();
  for (const [key, record] of stores.entries()) {
    if (record.resetAt <= now) stores.delete(key);
  }
}

setInterval(pruneStaleStores, 15 * 60 * 1000);
