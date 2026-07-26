import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { ScheduleType } from '@prisma/client';
import { createJobSchema, updateJobSchema } from '../../types/job.types';

const { mockCreateJob, mockUpdateJob, mockVerifyAccessToken } = vi.hoisted(() => ({
  mockCreateJob: vi.fn(),
  mockUpdateJob: vi.fn(),
  mockVerifyAccessToken: vi.fn(),
}));

vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return { ...actual, PrismaClient: class MockPrismaClient {} };
});

vi.mock('../../services/job.service', () => ({
  JobService: vi.fn(function JobServiceMock() {
    return {
      createJob: mockCreateJob,
      updateJob: mockUpdateJob,
      getJobs: vi.fn(),
      getMyJobs: vi.fn(),
      getJobById: vi.fn(),
      updateDriverNotes: vi.fn(),
      deleteJob: vi.fn(),
    };
  }),
}));

vi.mock('../../services/completion-report.service', () => ({
  CompletionReportService: vi.fn(function CompletionReportServiceMock() {
    return {
      canModify: vi.fn(),
      upsert: vi.fn(),
      approve: vi.fn(),
      unlock: vi.fn(),
      getJobForPdf: vi.fn(),
      generatePdf: vi.fn(),
    };
  }),
}));

vi.mock('../../services/audit.service', () => ({
  AuditService: {
    logFromRequest: vi.fn().mockResolvedValue(undefined),
    logEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/jwt', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/jwt')>();
  return { ...actual, verifyAccessToken: mockVerifyAccessToken };
});

import { app } from '../../app';
import { UserRole } from '../../types/auth.types';

const JOB_ID = 'clqmvt0000000job2';
const START = '2026-08-01T09:00:00.000Z';
const END = '2026-08-01T11:00:00.000Z';

function authedPost(role: UserRole, body: object) {
  mockVerifyAccessToken.mockReturnValueOnce({ userId: 'user-1', email: 'u@example.com', role });
  return request(app)
    .post('/api/jobs')
    .set('Authorization', 'Bearer valid-token')
    .send(body);
}

function authedPatch(role: UserRole, body: object) {
  mockVerifyAccessToken.mockReturnValueOnce({ userId: 'user-1', email: 'u@example.com', role });
  return request(app)
    .patch(`/api/jobs/${JOB_ID}`)
    .set('Authorization', 'Bearer valid-token')
    .send(body);
}

// ── Unit tests — Zod schema validation ────────────────────────────────────

describe('Job Zod schema — scheduleType', () => {
  const baseCreatePayload = {
    title: 'Test Job',
    jobType: 'DELIVERY',
    scheduledStart: START,
    scheduledEnd: END,
  };

  it('accepts an omitted scheduleType (Prisma default DURATION applies)', () => {
    const result = createJobSchema.safeParse(baseCreatePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduleType).toBeUndefined();
    }
  });

  it('accepts an explicit scheduleType of DURATION', () => {
    const result = createJobSchema.safeParse({ ...baseCreatePayload, scheduleType: 'DURATION' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduleType).toBe(ScheduleType.DURATION);
    }
  });

  it('rejects an unknown scheduleType value such as "ASAP"', () => {
    const result = createJobSchema.safeParse({ ...baseCreatePayload, scheduleType: 'ASAP' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('scheduleType');
    }
  });

  it('rejects scheduleType WINDOW when scheduledEnd is null', () => {
    const result = createJobSchema.safeParse({
      title: 'Test Job',
      jobType: 'DELIVERY',
      scheduledStart: START,
      scheduledEnd: null,
      scheduleType: 'WINDOW',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('scheduledEnd');
    }
  });

  it('rejects scheduleType WINDOW when scheduledEnd is absent', () => {
    const result = createJobSchema.safeParse({
      title: 'Test Job',
      jobType: 'DELIVERY',
      scheduledStart: START,
      scheduleType: 'WINDOW',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues[0]?.message;
      expect(message).toMatch(/WINDOW/i);
    }
  });

  it('accepts scheduleType WINDOW when scheduledEnd is provided', () => {
    const result = createJobSchema.safeParse({ ...baseCreatePayload, scheduleType: 'WINDOW' });
    expect(result.success).toBe(true);
  });

  it('accepts scheduleType FIXED without scheduledEnd (left permissive)', () => {
    const result = createJobSchema.safeParse({
      title: 'Test Job',
      jobType: 'DELIVERY',
      scheduledStart: START,
      scheduleType: 'FIXED',
    });
    expect(result.success).toBe(true);
  });

  it('accepts scheduleType on updateJobSchema', () => {
    const result = updateJobSchema.safeParse({ scheduleType: 'FIXED' });
    expect(result.success).toBe(true);
  });

  it('rejects scheduleType WINDOW on updateJobSchema when scheduledEnd is null', () => {
    const result = updateJobSchema.safeParse({ scheduleType: 'WINDOW', scheduledEnd: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('scheduledEnd');
    }
  });
});

// ── Integration tests — HTTP endpoints (JobService + JWT verification mocked) ──

describe('POST /api/jobs — scheduleType', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a job and returns scheduleType in the response', async () => {
    mockCreateJob.mockResolvedValueOnce({ id: JOB_ID, scheduleType: ScheduleType.WINDOW });

    const res = await authedPost(UserRole.Dispatcher, {
      title: 'Test Job',
      jobType: 'DELIVERY',
      scheduledStart: START,
      scheduledEnd: END,
      scheduleType: 'WINDOW',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.scheduleType).toBe('WINDOW');
    expect(mockCreateJob).toHaveBeenCalledWith(
      expect.objectContaining({ scheduleType: 'WINDOW' }),
      'user-1'
    );
  });

  it('rejects an unknown scheduleType value with 400', async () => {
    const res = await authedPost(UserRole.Dispatcher, {
      title: 'Test Job',
      jobType: 'DELIVERY',
      scheduledStart: START,
      scheduledEnd: END,
      scheduleType: 'ASAP',
    });

    expect(res.status).toBe(400);
    expect(mockCreateJob).not.toHaveBeenCalled();
  });

  it('rejects scheduleType WINDOW without scheduledEnd with 400', async () => {
    const res = await authedPost(UserRole.Dispatcher, {
      title: 'Test Job',
      jobType: 'DELIVERY',
      scheduledStart: START,
      scheduleType: 'WINDOW',
    });

    expect(res.status).toBe(400);
    expect(mockCreateJob).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/jobs/:id — scheduleType', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates scheduleType and returns it in the response', async () => {
    mockUpdateJob.mockResolvedValueOnce({ id: JOB_ID, scheduleType: ScheduleType.FIXED });

    const res = await authedPatch(UserRole.Admin, { scheduleType: 'FIXED' });

    expect(res.status).toBe(200);
    expect(res.body.data.scheduleType).toBe('FIXED');
    expect(mockUpdateJob).toHaveBeenCalledWith(
      JOB_ID,
      expect.objectContaining({ scheduleType: 'FIXED' }),
      UserRole.Admin,
      'user-1'
    );
  });

  it('Driver JWT sending scheduleType receives 403', async () => {
    const res = await authedPatch(UserRole.Driver, { scheduleType: 'FIXED' });

    expect(res.status).toBe(403);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });
});
