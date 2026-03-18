import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Response, NextFunction } from 'express';
import { requireRole, adminOnly, adminOrDispatcher, blockDrivers } from '../../middleware/requireRole';
import { UserRole } from '../../types/auth.types';
import type { AuthenticatedRequest } from '../../types/auth.types';

function makeReq(role?: UserRole): AuthenticatedRequest {
  return {
    user: role ? { id: 'u1', email: 'test@example.com', role } : undefined,
  } as unknown as AuthenticatedRequest;
}

function makeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response;
}

describe('requireRole middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  it('calls next when user role is in the allowed list', () => {
    const middleware = requireRole(UserRole.Admin, UserRole.Dispatcher);
    middleware(makeReq(UserRole.Admin), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('calls next for Dispatcher when Dispatcher is allowed', () => {
    const middleware = requireRole(UserRole.Admin, UserRole.Dispatcher);
    middleware(makeReq(UserRole.Dispatcher), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user role is not in the allowed list', () => {
    const middleware = requireRole(UserRole.Admin);
    const res = makeRes();
    middleware(makeReq(UserRole.Driver), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user is undefined', () => {
    const middleware = requireRole(UserRole.Admin);
    const res = makeRes();
    middleware(makeReq(undefined), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for Driver on an Admin-only route', () => {
    const res = makeRes();
    adminOnly(makeReq(UserRole.Driver), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for Dispatcher on an Admin-only route', () => {
    const res = makeRes();
    adminOnly(makeReq(UserRole.Dispatcher), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows Admin through adminOnly', () => {
    adminOnly(makeReq(UserRole.Admin), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('allows Admin through adminOrDispatcher', () => {
    adminOrDispatcher(makeReq(UserRole.Admin), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('allows Dispatcher through adminOrDispatcher', () => {
    adminOrDispatcher(makeReq(UserRole.Dispatcher), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('blocks Driver through adminOrDispatcher', () => {
    const res = makeRes();
    adminOrDispatcher(makeReq(UserRole.Driver), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blockDrivers allows Admin', () => {
    blockDrivers(makeReq(UserRole.Admin), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('blockDrivers allows Dispatcher', () => {
    blockDrivers(makeReq(UserRole.Dispatcher), makeRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('blockDrivers blocks Driver', () => {
    const res = makeRes();
    blockDrivers(makeReq(UserRole.Driver), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
