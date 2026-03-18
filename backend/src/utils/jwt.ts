import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload, RefreshTokenPayload, TokenError, UserRole } from '../types/auth.types';

export function generateAccessToken(userId: string, email: string, role: UserRole): string {
  return jwt.sign({ userId, email, role }, process.env.JWT_SECRET!, {
    expiresIn: '15m',
    issuer: 'work_management_system',
    subject: userId,
  });
}

export function generateRefreshToken(tokenId: string, userId: string): string {
  return jwt.sign({ tokenId, userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d',
    issuer: 'work_management_system',
    subject: userId,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    if (!decoded.userId || !decoded.email || !decoded.role) {
      throw new TokenError('Invalid token payload', 'INVALID_PAYLOAD');
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenError('Access token expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenError('Invalid access token', 'INVALID_TOKEN');
    }
    throw error;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as RefreshTokenPayload;
    if (!decoded.tokenId || !decoded.userId) {
      throw new TokenError('Invalid refresh token payload', 'INVALID_PAYLOAD');
    }
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenError('Refresh token expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenError('Invalid refresh token', 'INVALID_TOKEN');
    }
    throw error;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateTokenId(): string {
  return crypto.randomBytes(16).toString('hex');
}
