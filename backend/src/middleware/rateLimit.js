/**
 * Minimal in-process fixed-window rate limiter.
 *
 * Sufficient for a single-process API. A multi-instance deployment must move
 * this state to a shared store (Redis) or the limit becomes per-instance.
 */
const buckets = new Map();

const prune = (now) => {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

export const rateLimit = ({ windowMs = 60_000, max = 60, keyGenerator } = {}) => {
  let lastPrune = Date.now();

  return (req, res, next) => {
    const now = Date.now();

    if (now - lastPrune > windowMs) {
      prune(now);
      lastPrune = now;
    }

    const id = keyGenerator ? keyGenerator(req) : (req.ip || 'unknown');
    const key = `${req.baseUrl || ''}${req.path || ''}:${id}`;

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));

      // A throttled request may still be uploading its body. Destroying the
      // socket mid-upload makes the client see ECONNRESET instead of the 429,
      // so drain the remaining bytes to /dev/null and let the response close
      // cleanly. Nothing is buffered, so memory stays flat.
      if (req.readable && !req.readableEnded) {
        res.setHeader('Connection', 'close');
        req.resume();
      }

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }

    return next();
  };
};

export const resetRateLimits = () => buckets.clear();
