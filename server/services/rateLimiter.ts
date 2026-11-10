/**
 * Sliding Window Token Bucket Rate Limiter
 * Provides thread-safe, in-memory rate limiting with customizable buckets.
 */
import { Request, Response, NextFunction } from 'express';

interface BucketEntry {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, BucketEntry>();

export interface RateLimitOptions {
  windowMs: number; // e.g. 60000 (1 minute)
  max: number;      // e.g. 60 requests per windowMs
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const windowMs = options.windowMs || 60000;
  const max = options.max || 60;
  const message = options.message || 'Too many requests, please try again later.';
  const keyGen = options.keyGenerator || ((req: Request) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    return `${req.baseUrl || ''}${req.path}:${ip}`;
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGen(req);
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { tokens: max, lastRefill: now };
      buckets.set(key, bucket);
    } else {
      // Calculate refill
      const elapsed = now - bucket.lastRefill;
      const tokensToAdd = Math.floor((elapsed / windowMs) * max);
      if (tokensToAdd > 0) {
        bucket.tokens = Math.min(max, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', bucket.tokens);
      next();
    } else {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      res.status(429).json({
        success: false,
        error: message,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
  };
}

// Pre-configured rate limiters
export const standardLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Standard API rate limit exceeded.'
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please wait 15 minutes.'
});

export const otpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests. Please wait before requesting another code.'
});

export const bookingLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Booking request frequency exceeded.'
});

// Clean up stale buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets.entries()) {
    if (now - b.lastRefill > 30 * 60 * 1000) {
      buckets.delete(key);
    }
  }
}, 10 * 60 * 1000);
