import { NextRequest } from 'next/server';
import { ApiError } from './errors';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const rateLimitStore: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  }
): Promise<void> {
  // Skip rate limiting if disabled
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return;
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const key = `${config.keyPrefix || 'default'}:${ip}`;
  const now = Date.now();

  if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
    rateLimitStore[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return;
  }

  rateLimitStore[key].count++;

  if (rateLimitStore[key].count > config.maxRequests) {
    const retryAfter = Math.ceil((rateLimitStore[key].resetTime - now) / 1000);
    throw new ApiError(
      429,
      `Too many requests. Please try again in ${retryAfter} seconds.`
    );
  }
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (request: NextRequest) => {
    await rateLimit(request, config);
  };
}
