import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanupExpiredTokens } from '../jobs/cleanupTokens';

const mockDeleteMany = vi.fn();

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    refreshToken: {
      deleteMany: mockDeleteMany,
    },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('cleanupExpiredTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes expired tokens (expiresAt < now)', async () => {
    mockDeleteMany.mockResolvedValue({ count: 3 });
    const result = await cleanupExpiredTokens();
    expect(result.deletedCount).toBe(3);
    expect(mockDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ expiresAt: expect.objectContaining({ lt: expect.any(Date) }) }),
          ]),
        }),
      })
    );
  });

  it('deletes revoked tokens (revokedAt not null)', async () => {
    mockDeleteMany.mockResolvedValue({ count: 5 });
    const result = await cleanupExpiredTokens();
    expect(result.deletedCount).toBe(5);
    expect(mockDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ revokedAt: { not: null } }),
          ]),
        }),
      })
    );
  });

  it('returns 0 when nothing to clean up', async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    const result = await cleanupExpiredTokens();
    expect(result.deletedCount).toBe(0);
  });

  it('is idempotent — calling twice gives same delete query shape', async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    await cleanupExpiredTokens();
    await cleanupExpiredTokens();
    expect(mockDeleteMany).toHaveBeenCalledTimes(2);
    expect(mockDeleteMany.mock.calls[0]).toEqual(mockDeleteMany.mock.calls[1]);
  });

  it('propagates database errors', async () => {
    mockDeleteMany.mockRejectedValue(new Error('DB connection lost'));
    await expect(cleanupExpiredTokens()).rejects.toThrow('DB connection lost');
  });
});
