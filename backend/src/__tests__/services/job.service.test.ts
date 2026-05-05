import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobStatus, UserRole, PrismaClient } from '@prisma/client';
import { JobService } from '../../services/job.service';

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockCompletionReportFindUnique = vi.fn();

vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return {
    ...actual,
    PrismaClient: vi.fn().mockImplementation(() => ({
      job: {
        findFirst: mockFindFirst,
        findMany: mockFindMany,
        count: mockCount,
        create: mockCreate,
        update: mockUpdate,
      },
      completionReport: {
        findUnique: mockCompletionReportFindUnique,
      },
    })),
  };
});

const service = new JobService(new PrismaClient());

const baseJob = {
  id: 'job-1',
  title: 'Test Job',
  description: null,
  status: JobStatus.DRAFT,
  assignedDriverId: null,
  scheduledAt: null,
  scheduledStart: null,
  scheduledEnd: null,
  schedulingNote: 'Default note',
  location: null,
  notes: null,
  createdById: 'user-admin',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  createdBy: { id: 'user-admin', name: 'Admin', email: 'admin@example.com' },
  assignedDriver: null,
};

describe('JobService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no completion report (safe for most tests)
    mockCompletionReportFindUnique.mockResolvedValue(null);
  });

  describe('createJob', () => {
    it('creates a job and returns it', async () => {
      mockCreate.mockResolvedValue(baseJob);

      const result = await service.createJob(
        { title: 'Test Job', jobType: 'DELIVERY' as const },
        'user-admin'
      );

      expect(result).toEqual(baseJob);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Test Job', createdById: 'user-admin' }),
        })
      );
    });

    it('converts scheduledAt string to Date', async () => {
      mockCreate.mockResolvedValue(baseJob);
      await service.createJob({ title: 'Job', jobType: 'DELIVERY' as const, scheduledAt: '2025-06-01T10:00:00Z' }, 'user-1');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scheduledAt: new Date('2025-06-01T10:00:00Z') }),
        })
      );
    });
  });

  describe('getJobs', () => {
    it('returns all jobs for Admin', async () => {
      mockFindMany.mockResolvedValue([baseJob]);
      mockCount.mockResolvedValue(1);

      const result = await service.getJobs({}, UserRole.Admin, 'user-admin');

      expect(result.jobs).toHaveLength(1);
      expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 1, pages: 1 });
      // Admin sees no assignedDriverId filter
      const [findManyCall] = mockFindMany.mock.calls;
      expect(findManyCall[0].where.assignedDriverId).toBeUndefined();
    });

    it('restricts Driver to own assigned jobs', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await service.getJobs({}, UserRole.Driver, 'driver-1');

      const [findManyCall] = mockFindMany.mock.calls;
      expect(findManyCall[0].where.assignedDriverId).toBe('driver-1');
    });

    it('applies status filter', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await service.getJobs({ status: 'ASSIGNED' }, UserRole.Admin, 'admin-1');

      expect(mockFindMany.mock.calls[0][0].where.status).toBe('ASSIGNED');
    });

    it('applies pagination', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(25);

      const result = await service.getJobs({ page: 2, limit: 5 }, UserRole.Admin, 'admin-1');

      expect(mockFindMany.mock.calls[0][0].skip).toBe(5);
      expect(mockFindMany.mock.calls[0][0].take).toBe(5);
      expect(result.pagination.pages).toBe(5);
    });
  });

  describe('getJobById', () => {
    it('returns job when found', async () => {
      mockFindFirst.mockResolvedValue(baseJob);
      const result = await service.getJobById('job-1', UserRole.Admin, 'admin-1');
      expect(result).toEqual(baseJob);
    });

    it('returns null when not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      const result = await service.getJobById('missing', UserRole.Admin, 'admin-1');
      expect(result).toBeNull();
    });

    it('includes assignedDriverId filter for Driver', async () => {
      mockFindFirst.mockResolvedValue(null);
      await service.getJobById('job-1', UserRole.Driver, 'driver-1');
      expect(mockFindFirst.mock.calls[0][0].where.assignedDriverId).toBe('driver-1');
    });
  });

  describe('updateJob', () => {
    it('returns null when job not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      const result = await service.updateJob('missing', { title: 'x' }, UserRole.Admin, 'admin-1');
      expect(result).toBeNull();
    });

    it('updates and returns job on valid data', async () => {
      mockFindFirst.mockResolvedValue(baseJob);
      const updated = { ...baseJob, title: 'Updated' };
      mockUpdate.mockResolvedValue(updated);

      const result = await service.updateJob('job-1', { title: 'Updated' }, UserRole.Admin, 'admin-1');
      expect(result?.title).toBe('Updated');
    });

    it('allows valid status transition DRAFT → ASSIGNED', async () => {
      mockFindFirst.mockResolvedValue(baseJob);
      mockUpdate.mockResolvedValue({ ...baseJob, status: JobStatus.ASSIGNED });

      await expect(
        service.updateJob('job-1', { status: 'ASSIGNED' }, UserRole.Admin, 'admin-1')
      ).resolves.not.toThrow();
    });

    it('throws on invalid status transition IN_PROGRESS → DRAFT', async () => {
      mockFindFirst.mockResolvedValue({ ...baseJob, status: JobStatus.IN_PROGRESS });

      await expect(
        service.updateJob('job-1', { status: 'DRAFT' }, UserRole.Admin, 'admin-1')
      ).rejects.toThrow('Invalid status transition from IN_PROGRESS to DRAFT');
    });

    it('throws on invalid transition COMPLETED → anything', async () => {
      mockFindFirst.mockResolvedValue({ ...baseJob, status: JobStatus.COMPLETED });

      await expect(
        service.updateJob('job-1', { status: 'ASSIGNED' }, UserRole.Admin, 'admin-1')
      ).rejects.toThrow('Invalid status transition');
    });

    it('throws COMPLETION_REPORT_REQUIRED when transitioning to COMPLETED without approved report', async () => {
      mockFindFirst.mockResolvedValue({ ...baseJob, status: JobStatus.IN_PROGRESS });
      mockCompletionReportFindUnique.mockResolvedValue(null);

      await expect(
        service.updateJob('job-1', { status: 'COMPLETED' }, UserRole.Admin, 'admin-1')
      ).rejects.toThrow('COMPLETION_REPORT_REQUIRED');
    });

    it('throws COMPLETION_REPORT_REQUIRED when report exists but is not approved', async () => {
      mockFindFirst.mockResolvedValue({ ...baseJob, status: JobStatus.IN_PROGRESS });
      mockCompletionReportFindUnique.mockResolvedValue({ approvedAt: null });

      await expect(
        service.updateJob('job-1', { status: 'COMPLETED' }, UserRole.Admin, 'admin-1')
      ).rejects.toThrow('COMPLETION_REPORT_REQUIRED');
    });

    it('allows transition to COMPLETED when approved report exists', async () => {
      mockFindFirst.mockResolvedValue({ ...baseJob, status: JobStatus.IN_PROGRESS });
      mockCompletionReportFindUnique.mockResolvedValue({ approvedAt: new Date() });
      mockUpdate.mockResolvedValue({ ...baseJob, status: JobStatus.COMPLETED });

      await expect(
        service.updateJob('job-1', { status: 'COMPLETED' }, UserRole.Admin, 'admin-1')
      ).resolves.not.toThrow();
    });
  });

  describe('updateDriverNotes', () => {
    it('returns null when job not found', async () => {
      mockFindFirst.mockResolvedValue(null);
      const result = await service.updateDriverNotes('missing', 'some notes', 'driver-1');
      expect(result).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('throws FORBIDDEN when caller is not the assigned driver', async () => {
      mockFindFirst.mockResolvedValue({ ...baseJob, assignedDriverId: 'driver-1' });
      await expect(
        service.updateDriverNotes('job-1', 'notes', 'other-user')
      ).rejects.toThrow('FORBIDDEN');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('throws FORBIDDEN when job has no assigned driver', async () => {
      mockFindFirst.mockResolvedValue({ ...baseJob, assignedDriverId: null });
      await expect(
        service.updateDriverNotes('job-1', 'notes', 'driver-1')
      ).rejects.toThrow('FORBIDDEN');
    });

    it('updates and returns job when caller is assigned driver', async () => {
      const jobWithDriver = { ...baseJob, assignedDriverId: 'driver-1' };
      const updated = { ...jobWithDriver, driverNotes: 'Delivered late due to traffic' };
      mockFindFirst.mockResolvedValue(jobWithDriver);
      mockUpdate.mockResolvedValue(updated);

      const result = await service.updateDriverNotes('job-1', 'Delivered late due to traffic', 'driver-1');
      expect(result?.driverNotes).toBe('Delivered late due to traffic');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job-1' },
          data: expect.objectContaining({ driverNotes: 'Delivered late due to traffic' }),
        })
      );
    });

    it('allows clearing notes with empty string', async () => {
      const jobWithDriver = { ...baseJob, assignedDriverId: 'driver-1', driverNotes: 'old notes' };
      mockFindFirst.mockResolvedValue(jobWithDriver);
      mockUpdate.mockResolvedValue({ ...jobWithDriver, driverNotes: '' });

      const result = await service.updateDriverNotes('job-1', '', 'driver-1');
      expect(result?.driverNotes).toBe('');
    });
  });

  describe('deleteJob', () => {
    it('soft-deletes by setting deletedAt', async () => {
      mockFindFirst.mockResolvedValue(baseJob);
      mockUpdate.mockResolvedValue({ ...baseJob, deletedAt: new Date() });

      const result = await service.deleteJob('job-1');
      expect(result?.deletedAt).toBeTruthy();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it('returns null when job not found or already deleted', async () => {
      mockFindFirst.mockResolvedValue(null);
      const result = await service.deleteJob('missing');
      expect(result).toBeNull();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
