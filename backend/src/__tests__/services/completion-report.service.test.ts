import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRole, PrismaClient } from '@prisma/client';
import { CompletionReportService } from '../../services/completion-report.service';

const mockJobFindFirst = vi.fn();
const mockReportFindUnique = vi.fn();
const mockReportUpsert = vi.fn();
const mockReportUpdate = vi.fn();

vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return {
    ...actual,
    PrismaClient: vi.fn().mockImplementation(() => ({
      job: { findFirst: mockJobFindFirst },
      completionReport: {
        findUnique: mockReportFindUnique,
        upsert: mockReportUpsert,
        update: mockReportUpdate,
      },
    })),
  };
});

const service = new CompletionReportService(new PrismaClient());

const baseReport = {
  id: 'report-1',
  jobId: 'job-1',
  workDescription: 'Transported goods',
  actualStart: new Date('2026-03-23T08:00:00Z'),
  actualEnd: new Date('2026-03-23T10:30:00Z'),
  totalHours: 2.5,
  customerName: 'Matti Meikäläinen',
  customerSignature: 'data:image/png;base64,abc123',
  approvedAt: null,
  createdById: 'driver-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CompletionReportService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('canModify', () => {
    it('returns true for Admin regardless of job', async () => {
      const result = await service.canModify('admin-1', UserRole.Admin, 'job-1');
      expect(result).toBe(true);
      expect(mockJobFindFirst).not.toHaveBeenCalled();
    });

    it('returns true for Dispatcher regardless of job', async () => {
      const result = await service.canModify('disp-1', UserRole.Dispatcher, 'job-1');
      expect(result).toBe(true);
    });

    it('returns true for Driver who is assigned to the job', async () => {
      mockJobFindFirst.mockResolvedValue({ assignedDriverId: 'driver-1' });
      const result = await service.canModify('driver-1', UserRole.Driver, 'job-1');
      expect(result).toBe(true);
    });

    it('returns false for Driver not assigned to the job', async () => {
      mockJobFindFirst.mockResolvedValue({ assignedDriverId: 'other-driver' });
      const result = await service.canModify('driver-1', UserRole.Driver, 'job-1');
      expect(result).toBe(false);
    });

    it('returns false for Driver when job does not exist', async () => {
      mockJobFindFirst.mockResolvedValue(null);
      const result = await service.canModify('driver-1', UserRole.Driver, 'missing');
      expect(result).toBe(false);
    });
  });

  describe('upsert', () => {
    const validData = {
      workDescription: 'Transported goods to warehouse',
      actualStart: '2026-03-23T08:00:00Z',
      actualEnd: '2026-03-23T10:30:00Z',
      customerName: 'Matti Meikäläinen',
      customerSignature: 'data:image/png;base64,abc123',
    };

    it('throws JOB_NOT_FOUND when job does not exist', async () => {
      mockJobFindFirst.mockResolvedValue(null);
      await expect(service.upsert('missing', 'driver-1', validData)).rejects.toThrow('JOB_NOT_FOUND');
      expect(mockReportUpsert).not.toHaveBeenCalled();
    });

    it('calculates totalHours and upserts report', async () => {
      mockJobFindFirst.mockResolvedValue({ id: 'job-1' });
      mockReportUpsert.mockResolvedValue(baseReport);

      const result = await service.upsert('job-1', 'driver-1', validData);

      expect(result).toEqual(baseReport);
      expect(mockReportUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jobId: 'job-1' },
          create: expect.objectContaining({
            totalHours: 2.5,
            jobId: 'job-1',
            createdById: 'driver-1',
          }),
          update: expect.objectContaining({
            totalHours: 2.5,
            approvedAt: null,
          }),
        })
      );
    });

    it('resets approvedAt to null on update', async () => {
      mockJobFindFirst.mockResolvedValue({ id: 'job-1' });
      mockReportUpsert.mockResolvedValue(baseReport);

      await service.upsert('job-1', 'driver-1', validData);

      const call = mockReportUpsert.mock.calls[0][0];
      expect(call.update.approvedAt).toBeNull();
    });
  });

  describe('approve', () => {
    it('throws REPORT_NOT_FOUND when no report exists', async () => {
      mockReportFindUnique.mockResolvedValue(null);
      await expect(service.approve('job-1')).rejects.toThrow('REPORT_NOT_FOUND');
      expect(mockReportUpdate).not.toHaveBeenCalled();
    });

    it('sets approvedAt to current time', async () => {
      mockReportFindUnique.mockResolvedValue(baseReport);
      const approvedReport = { ...baseReport, approvedAt: new Date() };
      mockReportUpdate.mockResolvedValue(approvedReport);

      const result = await service.approve('job-1');
      expect(result.approvedAt).toBeTruthy();
      expect(mockReportUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { jobId: 'job-1' },
          data: expect.objectContaining({ approvedAt: expect.any(Date) }),
        })
      );
    });
  });
});
