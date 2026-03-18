import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { verifyAccessToken } from '../utils/jwt';
import { TokenError } from '../types/auth.types';

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, email: payload.email, role: payload.role };
    next();
  } catch (error) {
    if (error instanceof TokenError) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    res.status(401).json({ error: 'Token verification failed' });
  }
}
