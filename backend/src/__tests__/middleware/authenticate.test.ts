import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Response, NextFunction } from 'express';
import { authenticateToken } from '../../middleware/authenticate';
import * as jwtUtils from '../../utils/jwt';
import { TokenError, UserRole } from '../../types/auth.types';
import type { AuthenticatedRequest } from '../../types/auth.types';

function makeReq(authHeader?: string): AuthenticatedRequest {
  return {
    headers: { authorization: authHeader },
  } as unknown as AuthenticatedRequest;
}

function makeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
}

describe('authenticateToken middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  afterEach(() => vi.restoreAllMocks());

  it('attaches user to req and calls next for a valid Bearer token', () => {
    vi.spyOn(jwtUtils, 'verifyAccessToken').mockReturnValue({
      userId: 'u1',
      email: 'test@example.com',
      role: UserRole.Admin,
      iat: 1,
      exp: 9999999999,
    });

    const req = makeReq('Bearer valid-token');
    const res = makeRes();

    authenticateToken(req, res, next);

    expect(req.user).toEqual({ id: 'u1', email: 'test@example.com', role: UserRole.Admin });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is absent', () => {
    const req = makeReq(undefined);
    const res = makeRes();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with "Bearer "', () => {
    const req = makeReq('Token abc123');
    const res = makeRes();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for "bearer" (lowercase) prefix — case sensitive', () => {
    const req = makeReq('bearer valid-token');
    const res = makeRes();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for empty token after "Bearer "', () => {
    // slice(7) of "Bearer " gives "" — falsy
    const req = makeReq('Bearer ');
    const res = makeRes();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', () => {
    vi.spyOn(jwtUtils, 'verifyAccessToken').mockImplementation(() => {
      throw new TokenError('Access token expired', 'TOKEN_EXPIRED');
    });

    const req = makeReq('Bearer expired-token');
    const res = makeRes();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token signature is invalid', () => {
    vi.spyOn(jwtUtils, 'verifyAccessToken').mockImplementation(() => {
      throw new TokenError('Invalid access token', 'INVALID_TOKEN');
    });

    const req = makeReq('Bearer tampered-token');
    const res = makeRes();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 on unexpected error from verifyAccessToken', () => {
    vi.spyOn(jwtUtils, 'verifyAccessToken').mockImplementation(() => {
      throw new Error('Unexpected failure');
    });

    const req = makeReq('Bearer valid-token');
    const res = makeRes();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
