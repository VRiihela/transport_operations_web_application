import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { AuthError, TokenError, UserRole } from '../types/auth.types';
import * as jwt from '../utils/jwt';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
} as unknown as PrismaClient;

const authService = new AuthService(mockPrisma);

describe('AuthService', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  describe('login', () => {
    const validUser = {
      id: 'user123',
      email: 'test@example.com',
      passwordHash: '$2b$12$hashedpassword',
      role: 'Admin',
      isActive: true,
    };

    it('returns user data on valid credentials', async () => {
      (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validUser);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await authService.login({ email: 'test@example.com', password: 'validpassword' });

      expect(result).toEqual({ userId: 'user123', email: 'test@example.com', role: UserRole.Admin });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });

    it('throws MISSING_CREDENTIALS when email is empty', async () => {
      await expect(authService.login({ email: '', password: 'password' }))
        .rejects.toThrow(new AuthError('Email and password are required', 'MISSING_CREDENTIALS'));
    });

    it('throws MISSING_CREDENTIALS when password is empty', async () => {
      await expect(authService.login({ email: 'test@example.com', password: '' }))
        .rejects.toThrow(new AuthError('Email and password are required', 'MISSING_CREDENTIALS'));
    });

    it('throws INVALID_EMAIL for malformed email', async () => {
      await expect(authService.login({ email: 'not-an-email', password: 'password' }))
        .rejects.toThrow(new AuthError('Invalid email format', 'INVALID_EMAIL'));
    });

    it('throws INVALID_CREDENTIALS when user not found', async () => {
      (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(authService.login({ email: 'nobody@example.com', password: 'password' }))
        .rejects.toThrow(new AuthError('Invalid credentials', 'INVALID_CREDENTIALS'));
    });

    it('throws INVALID_CREDENTIALS when user is deactivated', async () => {
      (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...validUser,
        isActive: false,
      });
      await expect(authService.login({ email: 'test@example.com', password: 'validpassword' }))
        .rejects.toThrow(new AuthError('Invalid credentials', 'INVALID_CREDENTIALS'));
    });

    it('throws INVALID_CREDENTIALS when password is wrong', async () => {
      (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validUser);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      await expect(authService.login({ email: 'test@example.com', password: 'wrongpassword' }))
        .rejects.toThrow(new AuthError('Invalid credentials', 'INVALID_CREDENTIALS'));
    });

    it('throws AUTH_ERROR on database failure', async () => {
      (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB down'));
      await expect(authService.login({ email: 'test@example.com', password: 'password' }))
        .rejects.toThrow(new AuthError('Authentication failed', 'AUTH_ERROR'));
    });

    it('normalises email to lowercase and trims whitespace', async () => {
      (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(validUser);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      await authService.login({ email: '  TEST@EXAMPLE.COM  ', password: 'password' });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    });
  });

  describe('createTokenPair', () => {
    it('creates access and refresh tokens and persists refresh token', async () => {
      (mockPrisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      vi.spyOn(jwt, 'generateAccessToken').mockReturnValue('mock-access-token');
      vi.spyOn(jwt, 'generateRefreshToken').mockReturnValue('mock-refresh-token');
      vi.spyOn(jwt, 'generateTokenId').mockReturnValue('token123');
      vi.spyOn(jwt, 'hashToken').mockReturnValue('hashed-token');

      const result = await authService.createTokenPair('user123', 'test@example.com', UserRole.Admin);

      expect(result).toEqual({ accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith({
        data: { id: 'token123', tokenHash: 'hashed-token', userId: 'user123', expiresAt: expect.any(Date) },
      });
    });

    it('throws INVALID_USER_DATA when userId is empty', async () => {
      await expect(authService.createTokenPair('', 'test@example.com', UserRole.Admin))
        .rejects.toThrow(new AuthError('Invalid user data for token creation', 'INVALID_USER_DATA'));
    });

    it('throws INVALID_USER_DATA when email is empty', async () => {
      await expect(authService.createTokenPair('user123', '', UserRole.Admin))
        .rejects.toThrow(new AuthError('Invalid user data for token creation', 'INVALID_USER_DATA'));
    });

    it('throws TOKEN_CREATION_ERROR on database failure', async () => {
      (mockPrisma.refreshToken.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
      await expect(authService.createTokenPair('user123', 'test@example.com', UserRole.Admin))
        .rejects.toThrow(new AuthError('Token generation failed', 'TOKEN_CREATION_ERROR'));
    });
  });

  describe('verifyAccessToken', () => {
    it('returns decoded payload for valid token', () => {
      const mockPayload = { userId: 'user123', email: 'test@example.com', role: UserRole.Admin, iat: 1, exp: 2 };
      vi.spyOn(jwt, 'verifyAccessToken').mockReturnValue(mockPayload);
      expect(authService.verifyAccessToken('valid-token')).toEqual(mockPayload);
    });

    it('throws MISSING_TOKEN for empty token', () => {
      expect(() => authService.verifyAccessToken(''))
        .toThrow(new TokenError('Token is required', 'MISSING_TOKEN'));
    });

    it('propagates TokenError from jwt util', () => {
      vi.spyOn(jwt, 'verifyAccessToken').mockImplementation(() => {
        throw new TokenError('Invalid token', 'INVALID_TOKEN');
      });
      expect(() => authService.verifyAccessToken('bad-token'))
        .toThrow(new TokenError('Invalid token', 'INVALID_TOKEN'));
    });
  });

  describe('rotateRefreshToken', () => {
    const mockStoredToken = {
      id: 'token123',
      tokenHash: 'stored-hash',
      userId: 'user123',
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      user: { id: 'user123', email: 'test@example.com', role: 'Admin' },
    };

    it('throws MISSING_TOKEN for empty input', async () => {
      await expect(authService.rotateRefreshToken(''))
        .rejects.toThrow(new TokenError('Refresh token is required', 'MISSING_TOKEN'));
    });

    it('throws INVALID_TOKEN when token not found in DB', async () => {
      vi.spyOn(jwt, 'verifyRefreshToken').mockReturnValue({ tokenId: 'nonexistent', userId: 'user123', iat: 1, exp: 2 });
      (mockPrisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(authService.rotateRefreshToken('bad-token'))
        .rejects.toThrow(new TokenError('Invalid refresh token', 'INVALID_TOKEN'));
    });

    it('detects token reuse, revokes all user tokens, throws TOKEN_REUSE_DETECTED', async () => {
      vi.spyOn(jwt, 'verifyRefreshToken').mockReturnValue({ tokenId: 'token123', userId: 'user123', iat: 1, exp: 2 });
      (mockPrisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockStoredToken,
        revokedAt: new Date(),
      });
      (mockPrisma.refreshToken.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await expect(authService.rotateRefreshToken('reused-token'))
        .rejects.toThrow(new TokenError('Token reuse detected - all tokens revoked', 'TOKEN_REUSE_DETECTED'));

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user123', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('throws TOKEN_EXPIRED for expired token', async () => {
      vi.spyOn(jwt, 'verifyRefreshToken').mockReturnValue({ tokenId: 'token123', userId: 'user123', iat: 1, exp: 2 });
      (mockPrisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(authService.rotateRefreshToken('expired-token'))
        .rejects.toThrow(new TokenError('Refresh token expired', 'TOKEN_EXPIRED'));
    });

    it('throws INVALID_TOKEN when hash does not match', async () => {
      vi.spyOn(jwt, 'verifyRefreshToken').mockReturnValue({ tokenId: 'token123', userId: 'user123', iat: 1, exp: 2 });
      vi.spyOn(jwt, 'hashToken').mockReturnValue('wrong-hash');
      (mockPrisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStoredToken);
      await expect(authService.rotateRefreshToken('tampered-token'))
        .rejects.toThrow(new TokenError('Invalid refresh token', 'INVALID_TOKEN'));
    });

    it('revokes old token and creates new token pair on success', async () => {
      vi.spyOn(jwt, 'verifyRefreshToken').mockReturnValue({ tokenId: 'token123', userId: 'user123', iat: 1, exp: 2 });
      vi.spyOn(jwt, 'hashToken').mockReturnValue('stored-hash');
      (mockPrisma.refreshToken.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStoredToken);
      (mockPrisma.refreshToken.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      vi.spyOn(authService, 'createTokenPair').mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await authService.rotateRefreshToken('valid-token');
      expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'token123' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revokeRefreshToken', () => {
    it('marks token as revoked in DB', async () => {
      vi.spyOn(jwt, 'verifyRefreshToken').mockReturnValue({ tokenId: 'token123', userId: 'user123', iat: 1, exp: 2 });
      (mockPrisma.refreshToken.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({});

      await authService.revokeRefreshToken('valid-token');
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'token123', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('throws MISSING_TOKEN for empty input', async () => {
      await expect(authService.revokeRefreshToken(''))
        .rejects.toThrow(new TokenError('Refresh token is required', 'MISSING_TOKEN'));
    });

    it('throws TOKEN_REVOCATION_ERROR on database failure', async () => {
      vi.spyOn(jwt, 'verifyRefreshToken').mockReturnValue({ tokenId: 'token123', userId: 'user123', iat: 1, exp: 2 });
      (mockPrisma.refreshToken.updateMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));
      await expect(authService.revokeRefreshToken('valid-token'))
        .rejects.toThrow(new TokenError('Token revocation failed', 'TOKEN_REVOCATION_ERROR'));
    });
  });

  describe('hashPassword', () => {
    it('hashes password with bcrypt', async () => {
      vi.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$12$hashedpassword' as never);
      const result = await authService.hashPassword('validpassword');
      expect(result).toBe('$2b$12$hashedpassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('validpassword', 12);
    });

    it('throws MISSING_PASSWORD for empty password', async () => {
      await expect(authService.hashPassword(''))
        .rejects.toThrow(new AuthError('Password is required', 'MISSING_PASSWORD'));
    });

    it('throws WEAK_PASSWORD for password shorter than 8 chars', async () => {
      await expect(authService.hashPassword('short'))
        .rejects.toThrow(new AuthError('Password must be at least 8 characters', 'WEAK_PASSWORD'));
    });
  });
});
