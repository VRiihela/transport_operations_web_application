import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuditEvent } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { authenticateToken } from '../middleware/authenticate';
import { loginRateLimit, refreshRateLimit } from '../middleware/rateLimiter';
import { AuthenticatedRequest, AuthError, TokenError } from '../types/auth.types';

const router = Router();
const prisma = new PrismaClient();
const authService = new AuthService(prisma);

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(255),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

// POST /api/auth/login
router.post('/login', loginRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    await AuditService.logFromRequest(req, AuditEvent.LOGIN_FAILURE, undefined, {
      error: 'Validation failed',
    });
    res.status(400).json({ error: 'Invalid request format' });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const { userId, email: userEmail, role } = await authService.login({ email, password });
    const tokens = await authService.createTokenPair(userId, userEmail, role);

    await AuditService.logFromRequest(req, AuditEvent.LOGIN_SUCCESS, userId, { email: userEmail });

    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);
    res.json({
      accessToken: tokens.accessToken,
      user: { id: userId, email: userEmail, role },
    });
  } catch (error) {
    await AuditService.logFromRequest(req, AuditEvent.LOGIN_FAILURE, undefined, {
      error: error instanceof AuthError ? error.code : 'Internal error',
    });
    if (error instanceof AuthError && error.code === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', refreshRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (!refreshToken) {
    await AuditService.logFromRequest(req, AuditEvent.TOKEN_REFRESH, undefined, {
      error: 'Missing refresh token',
    });
    res.status(401).json({ error: 'Refresh token required' });
    return;
  }

  try {
    const tokens = await authService.rotateRefreshToken(refreshToken);

    await AuditService.logFromRequest(req, AuditEvent.TOKEN_REFRESH);

    res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    if (error instanceof TokenError && error.code === 'TOKEN_REUSE_DETECTED') {
      await AuditService.logFromRequest(req, AuditEvent.TOKEN_REUSE_DETECTED, undefined, {
        severity: 'HIGH',
      });
      res.clearCookie('refreshToken', { path: '/' });
      res.status(401).json({ error: 'Token reuse detected. Please login again.' });
      return;
    }
    await AuditService.logFromRequest(req, AuditEvent.TOKEN_REFRESH, undefined, {
      error: error instanceof TokenError ? error.code : 'Internal error',
    });
    res.clearCookie('refreshToken', { path: '/' });
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const refreshToken = req.cookies?.refreshToken as string | undefined;

  if (refreshToken) {
    try {
      await authService.revokeRefreshToken(refreshToken);
    } catch {
      // Non-fatal — still clear the cookie
    }
  }

  await AuditService.logFromRequest(req, AuditEvent.LOGOUT, req.user?.id);
  res.clearCookie('refreshToken', { path: '/' });
  res.json({ message: 'Logged out successfully' });
});

export { router as authRoutes };
