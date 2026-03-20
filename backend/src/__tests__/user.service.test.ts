import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { UserService } from '../services/user.service';

const safeUser = {
  id: 'cuid1',
  email: 'driver@example.com',
  name: null,
  role: 'Driver' as const,
  isActive: true,
  createdAt: new Date('2026-01-01'),
};

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaClient;

const service = new UserService(mockPrisma);

beforeEach(() => vi.clearAllMocks());

describe('UserService.createUser', () => {
  it('creates a user and returns safe fields', async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockPrisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(safeUser);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

    const result = await service.createUser({
      email: 'Driver@Example.COM',
      password: 'password123',
      role: 'Driver',
    });

    expect(result).toEqual(safeUser);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'driver@example.com', passwordHash: 'hashed' }),
      })
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('throws EMAIL_ALREADY_EXISTS when email is taken', async () => {
    (mockPrisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'existing' });

    await expect(
      service.createUser({ email: 'taken@example.com', password: 'password123', role: 'Driver' })
    ).rejects.toThrow('EMAIL_ALREADY_EXISTS');

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});

describe('UserService.listUsers', () => {
  it('returns all users when no filter given', async () => {
    (mockPrisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([safeUser]);

    const result = await service.listUsers();

    expect(result).toEqual([safeUser]);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    );
  });

  it('filters by role when provided', async () => {
    (mockPrisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([safeUser]);

    await service.listUsers('Driver');

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: 'Driver' } })
    );
  });
});

describe('UserService.updateUser', () => {
  it('deactivates a user', async () => {
    (mockPrisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (mockPrisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...safeUser, isActive: false });

    const result = await service.updateUser('cuid1', { isActive: false });

    expect(result.isActive).toBe(false);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cuid1' } })
    );
  });

  it('throws EMAIL_ALREADY_EXISTS when new email belongs to another user', async () => {
    (mockPrisma.user.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'other' });

    await expect(service.updateUser('cuid1', { email: 'taken@example.com' })).rejects.toThrow(
      'EMAIL_ALREADY_EXISTS'
    );
  });
});

describe('UserService.resetPassword', () => {
  it('hashes the new password and updates the user', async () => {
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('newhash' as never);
    (mockPrisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue(safeUser);

    await service.resetPassword('cuid1', 'newpassword123');

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cuid1' },
        data: { passwordHash: 'newhash' },
      })
    );
  });
});
