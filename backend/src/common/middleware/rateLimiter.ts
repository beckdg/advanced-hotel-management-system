import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { HTTP_STATUS } from '../constants';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;

function getClientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

export function rateLimiter(req: Request, _res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const key = getClientKey(req);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    next(
      new AppError('Too many requests, please try again later', HTTP_STATUS.TOO_MANY_REQUESTS, {
        code: 'RATE_LIMIT_EXCEEDED',
      }),
    );
    return;
  }

  entry.count += 1;
  next();
}

export function resetRateLimiterStore(): void {
  store.clear();
}
