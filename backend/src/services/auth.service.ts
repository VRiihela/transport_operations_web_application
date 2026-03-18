import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import {
  LoginCredentials,
  TokenPair,
  AuthError,
  TokenError,
  JwtPayload,
  UserRole,
} from '../types/auth.types';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateTokenId,
} from '../utils/jwt';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async login(credentials: LoginCredentials): Promise<{ userId: string; email: string; role: UserRole }> {
    if (!credentials.email || !credentials.password) {
      throw new AuthError('Email and password are required', 'MISSING_CREDENTIALS');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      throw new AuthError('Invalid email format', 'INVALID_EMAIL');
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase().trim() },
      });

      if (!user) {
        throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isValidPassword) {
        throw new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      return { userId: user.id, email: user.email, role: user.role as UserRole };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      console.error('Database error during login:', error);
      throw new AuthError('Authentication failed', 'AUTH_ERROR');
    }
  }

  async createTokenPair(userId: string, email: string, role: UserRole): Promise<TokenPair> {
    if (!userId || !email || !role) {
      throw new AuthError('Invalid user data for token creation', 'INVALID_USER_DATA');
    }

    try {
      const accessToken = generateAccessToken(userId, email, role);
      const tokenId = generateTokenId();
      const refreshToken = generateRefreshToken(tokenId, userId);
      const hashedRefreshToken = hashToken(refreshToken);

      await this.prisma.refreshToken.create({
        data: {
          id: tokenId,
          tokenHash: hashedRefreshToken,
          userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error creating token pair:', error);
      throw new AuthError('Token generation failed', 'TOKEN_CREATION_ERROR');
    }
  }

  verifyAccessToken(token: string): JwtPayload {
    if (!token) {
      throw new TokenError('Token is required', 'MISSING_TOKEN');
    }
    return verifyAccessToken(token);
  }

  async rotateRefreshToken(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken) {
      throw new TokenError('Refresh token is required', 'MISSING_TOKEN');
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      const hashedToken = hashToken(refreshToken);

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { id: payload.tokenId },
        include: { user: true },
      });

      if (!storedToken) {
        throw new TokenError('Invalid refresh token', 'INVALID_TOKEN');
      }

      if (storedToken.revokedAt) {
        await this.revokeAllUserTokens(storedToken.userId);
        throw new TokenError('Token reuse detected - all tokens revoked', 'TOKEN_REUSE_DETECTED');
      }

      if (storedToken.expiresAt < new Date()) {
        throw new TokenError('Refresh token expired', 'TOKEN_EXPIRED');
      }

      if (storedToken.tokenHash !== hashedToken) {
        throw new TokenError('Invalid refresh token', 'INVALID_TOKEN');
      }

      await this.prisma.refreshToken.update({
        where: { id: payload.tokenId },
        data: { revokedAt: new Date() },
      });

      return this.createTokenPair(storedToken.user.id, storedToken.user.email, storedToken.user.role as UserRole);
    } catch (error) {
      if (error instanceof TokenError || error instanceof AuthError) throw error;
      console.error('Error rotating refresh token:', error);
      throw new TokenError('Token rotation failed', 'TOKEN_ROTATION_ERROR');
    }
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      throw new TokenError('Refresh token is required', 'MISSING_TOKEN');
    }

    try {
      const payload = verifyRefreshToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.tokenId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof TokenError) throw error;
      console.error('Error revoking refresh token:', error);
      throw new TokenError('Token revocation failed', 'TOKEN_REVOCATION_ERROR');
    }
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new AuthError('Password is required', 'MISSING_PASSWORD');
    }
    if (password.length < 8) {
      throw new AuthError('Password must be at least 8 characters', 'WEAK_PASSWORD');
    }
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }
}
