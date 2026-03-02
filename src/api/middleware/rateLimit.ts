import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../utils/logger';

const logger = new Logger('RateLimitMiddleware');

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limiter for API endpoints.
 *
 * Production should use Redis or Azure API Management for
 * distributed rate limiting across multiple instances.
 *
 * Default: 100 requests per 15-minute window per authenticated user.
 */
export function rateLimitMiddleware(
  options: {
    windowMs?: number;
    maxRequests?: number;
  } = {}
) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const maxRequests = options.maxRequests || 100;
  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    const key = user?.sub || req.ip || 'unknown';
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        userId: key,
        count: entry.count,
        limit: maxRequests,
        path: req.path,
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit of ${maxRequests} requests per ${windowMs / 60000} minutes exceeded`,
        retryAfterMs: entry.resetTime - now,
      });
      return;
    }

    next();
  };
}
