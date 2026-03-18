import { Request } from 'express';

export interface LoginCredentials {
  email: string;
  password: string;
}

export enum UserRole {
  Admin = 'Admin',
  Dispatcher = 'Dispatcher',
  Driver = 'Driver',
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  tokenId: string;
  userId: string;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class TokenError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'TokenError';
  }
}
