import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';

// vi.mock is hoisted above imports — use vi.hoisted for variables needed in factory
const {
  mockLogin,
  mockCreateTokenPair,
  mockRotateRefreshToken,
  mockRevokeRefreshToken,
  mockVerifyAccessToken,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockCreateTokenPair: vi.fn(),
  mockRotateRefreshToken: vi.fn(),
  mockRevokeRefreshToken: vi.fn(),
  mockVerifyAccessToken: vi.fn(),
}));

vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return { ...actual, PrismaClient: vi.fn().mockImplementation(() => ({})) };
});

vi.mock('../../services/auth.service', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    login: mockLogin,
    createTokenPair: mockCreateTokenPair,
    rotateRefreshToken: mockRotateRefreshToken,
    revokeRefreshToken: mockRevokeRefreshToken,
    verifyAccessToken: mockVerifyAccessToken,
  })),
}));

vi.mock('../../services/audit.service', () => ({
  AuditService: {
    logFromRequest: vi.fn().mockResolvedValue(undefined),
    logEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock jwt utils so authenticateToken (used on logout) works without a real JWT_SECRET
vi.mock('../../utils/jwt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/jwt')>();
  return { ...actual, verifyAccessToken: mockVerifyAccessToken };
});

import { app } from '../../app';
import { AuthError, TokenError, UserRole } from '../../types/auth.types';

describe('Auth Routes', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  describe('POST /api/auth/login', () => {
    it('returns 200 with access token and sets httpOnly cookie on success', async () => {
      mockLogin.mockResolvedValue({ userId: 'u1', email: 'test@example.com', role: UserRole.Admin });
      mockCreateTokenPair.mockResolvedValue({ accessToken: 'acc-tok', refreshToken: 'ref-tok' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe('acc-tok');
      expect(res.body.user).toMatchObject({ id: 'u1', email: 'test@example.com', role: UserRole.Admin });
      const cookie = res.headers['set-cookie']?.[0] ?? '';
      expect(cookie).toContain('refreshToken=ref-tok');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
    });

    it('returns 401 with generic message for invalid credentials', async () => {
      mockLogin.mockRejectedValue(new AuthError('Invalid credentials', 'INVALID_CREDENTIALS'));

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });
      expect(res.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app).post('/api/auth/login').send({ password: 'password123' });
      expect(res.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('returns 400 for missing password', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
      expect(res.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('returns 400 for empty password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: '' });
      expect(res.status).toBe(400);
    });

    it('returns 400 for email exceeding 255 chars', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'a'.repeat(250) + '@x.com', password: 'password123' });
      expect(res.status).toBe(400);
    });

    it('returns 500 on unexpected service error', async () => {
      mockLogin.mockRejectedValue(new Error('DB down'));
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns 200 with new access token and rotates cookie on success', async () => {
      mockRotateRefreshToken.mockResolvedValue({ accessToken: 'new-acc', refreshToken: 'new-ref' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=valid-token');

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe('new-acc');
      const cookie = res.headers['set-cookie']?.[0] ?? '';
      expect(cookie).toContain('refreshToken=new-ref');
      expect(cookie).toContain('HttpOnly');
    });

    it('returns 401 when refresh token cookie is absent', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Refresh token required');
      expect(mockRotateRefreshToken).not.toHaveBeenCalled();
    });

    it('returns 401 and clears cookie on invalid token', async () => {
      mockRotateRefreshToken.mockRejectedValue(
        new TokenError('Invalid refresh token', 'INVALID_TOKEN')
      );
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=bad-token');
      expect(res.status).toBe(401);
      const cookie = res.headers['set-cookie']?.[0] ?? '';
      expect(cookie).toContain('refreshToken=;');
    });

    it('returns 401 with reuse message on TOKEN_REUSE_DETECTED', async () => {
      mockRotateRefreshToken.mockRejectedValue(
        new TokenError('Token reuse detected', 'TOKEN_REUSE_DETECTED')
      );
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=reused-token');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token reuse/i);
    });
  });

  describe('POST /api/auth/logout', () => {
    const validPayload = {
      userId: 'u1',
      email: 'test@example.com',
      role: UserRole.Admin,
      iat: 1,
      exp: 9_999_999_999,
    };

    it('returns 200 and clears cookie on success', async () => {
      mockVerifyAccessToken.mockReturnValue(validPayload);
      mockRevokeRefreshToken.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-access-token')
        .set('Cookie', 'refreshToken=ref-tok');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      const cookie = res.headers['set-cookie']?.[0] ?? '';
      expect(cookie).toContain('refreshToken=;');
    });

    it('returns 401 when no access token is provided', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });

    it('clears cookie even when revokeRefreshToken throws', async () => {
      mockVerifyAccessToken.mockReturnValue(validPayload);
      mockRevokeRefreshToken.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-access-token')
        .set('Cookie', 'refreshToken=ref-tok');

      expect(res.status).toBe(200);
      const cookie = res.headers['set-cookie']?.[0] ?? '';
      expect(cookie).toContain('refreshToken=;');
    });
  });
});
