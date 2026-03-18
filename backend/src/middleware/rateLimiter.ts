import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

function createLimiter(windowMs: number, max: number, message: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      res.set('Retry-After', retryAfter.toString());
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter,
        },
      });
    },
    keyGenerator: (req: Request): string => {
      const forwarded = req.get('X-Forwarded-For');
      if (forwarded) {
        const firstIp = forwarded.split(',')[0].trim();
        if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(firstIp) ||
            /^(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{0,4}$/.test(firstIp)) {
          return firstIp;
        }
      }
      return req.ip ?? 'unknown';
    },
  });
}

export const loginRateLimit = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many login attempts. Please try again in 15 minutes.'
);

export const refreshRateLimit = createLimiter(
  15 * 60 * 1000,
  30,
  'Too many token refresh requests. Please try again in 15 minutes.'
);
