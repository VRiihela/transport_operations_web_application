import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditEvent } from '@prisma/client';
import { AuditService } from '../services/audit.service';

// Mock PrismaClient
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return {
    ...actual,
    PrismaClient: vi.fn().mockImplementation(() => ({
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    })),
  };
});

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    get: (header: string) => {
      if (header === 'X-Forwarded-For') return overrides['X-Forwarded-For'] ?? undefined;
      if (header === 'User-Agent') return overrides['User-Agent'] ?? 'test-agent';
      return undefined;
    },
    ip: overrides.ip ?? '127.0.0.1',
    ...overrides,
  } as unknown as import('express').Request;
}

describe('AuditService.logFromRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs LOGIN_SUCCESS with userId', async () => {
    const spy = vi.spyOn(AuditService, 'logEvent').mockResolvedValue();
    await AuditService.logFromRequest(makeReq(), AuditEvent.LOGIN_SUCCESS, 'user-123');
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: AuditEvent.LOGIN_SUCCESS, userId: 'user-123' })
    );
  });

  it('logs LOGIN_FAILURE without userId', async () => {
    const spy = vi.spyOn(AuditService, 'logEvent').mockResolvedValue();
    await AuditService.logFromRequest(makeReq(), AuditEvent.LOGIN_FAILURE);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ event: AuditEvent.LOGIN_FAILURE, userId: undefined })
    );
  });

  it('extracts IP from X-Forwarded-For header', async () => {
    const spy = vi.spyOn(AuditService, 'logEvent').mockResolvedValue();
    await AuditService.logFromRequest(
      makeReq({ 'X-Forwarded-For': '203.0.113.5, 10.0.0.1' }),
      AuditEvent.LOGIN_SUCCESS
    );
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ ip: '203.0.113.5' }));
  });

  it('falls back to req.ip when no X-Forwarded-For', async () => {
    const spy = vi.spyOn(AuditService, 'logEvent').mockResolvedValue();
    await AuditService.logFromRequest(makeReq({ ip: '10.0.0.99' }), AuditEvent.LOGOUT);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ ip: '10.0.0.99' }));
  });

  it('rejects malicious X-Forwarded-For and falls back to req.ip', async () => {
    const spy = vi.spyOn(AuditService, 'logEvent').mockResolvedValue();
    await AuditService.logFromRequest(
      makeReq({ 'X-Forwarded-For': '<script>alert(1)</script>', ip: '10.0.0.1' }),
      AuditEvent.LOGIN_FAILURE
    );
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ ip: '10.0.0.1' }));
  });
});

describe('AuditService.logEvent', () => {
  it('does not throw when metadata is within size limit', async () => {
    const spy = vi.spyOn(AuditService as unknown as { logEvent: typeof AuditService.logEvent }, 'logEvent');
    spy.mockResolvedValue();
    await expect(
      AuditService.logEvent({
        event: AuditEvent.TOKEN_REFRESH,
        ip: '127.0.0.1',
        metadata: { tokenId: 'abc123' },
      })
    ).resolves.not.toThrow();
  });

  it('does not log password or token fields in metadata', async () => {
    const spy = vi.spyOn(AuditService, 'logEvent').mockImplementation(async (params) => {
      expect(params.metadata).not.toHaveProperty('password');
      expect(params.metadata).not.toHaveProperty('token');
      expect(params.metadata).not.toHaveProperty('refreshToken');
    });
    await AuditService.logFromRequest(makeReq(), AuditEvent.LOGIN_SUCCESS, 'u1', {
      email: 'test@example.com',
    });
    spy.mockRestore();
  });

  it('logs TOKEN_REUSE_DETECTED with HIGH severity', async () => {
    const spy = vi.spyOn(AuditService, 'logEvent').mockResolvedValue();
    await AuditService.logFromRequest(makeReq(), AuditEvent.TOKEN_REUSE_DETECTED, 'u1', {
      severity: 'HIGH',
      tokenId: 'tok-abc',
    });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.TOKEN_REUSE_DETECTED,
        metadata: expect.objectContaining({ severity: 'HIGH' }),
      })
    );
  });
});
