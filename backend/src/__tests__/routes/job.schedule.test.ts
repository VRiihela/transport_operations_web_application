import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const { mockUpdateJob, mockVerifyAccessToken } = vi.hoisted(() => ({
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
      updateJob: mockUpdateJob,
      createJob: vi.fn(),
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

const JOB_ID = 'clqmvt0000000job1';
const START = '2026-08-01T09:00:00.000Z';
const END = '2026-08-01T11:00:00.000Z';
const BEFORE_START = '2026-08-01T08:00:00.000Z';

const mockJob = {
  id: JOB_ID,
  scheduledStart: START,
  scheduledEnd: END,
  schedulingNote: 'Morning run',
};

function authedPatch(role: UserRole, body: object) {
  mockVerifyAccessToken.mockReturnValueOnce({ userId: 'user-1', email: 'u@example.com', role });
  return request(app)
    .patch(`/api/jobs/${JOB_ID}/schedule`)
    .set('Authorization', 'Bearer valid-token')
    .send(body);
}

describe('PATCH /api/jobs/:id/schedule', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Happy paths ────────────────────────────────────────────────────────────

  it('TC-01: valid payload with both dates → 200 with job data', async () => {
    mockUpdateJob.mockResolvedValueOnce(mockJob);

    const res = await authedPatch(UserRole.Dispatcher, { scheduledStart: START, scheduledEnd: END });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: mockJob });
    expect(mockUpdateJob).toHaveBeenCalledWith(
      JOB_ID,
      { scheduledStart: START, scheduledEnd: END },
      UserRole.Dispatcher,
      'user-1'
    );
  });

  it('TC-02: only schedulingNote provided → 200', async () => {
    const noteJob = { ...mockJob, schedulingNote: 'Updated note' };
    mockUpdateJob.mockResolvedValueOnce(noteJob);

    const res = await authedPatch(UserRole.Dispatcher, { schedulingNote: 'Updated note' });

    expect(res.status).toBe(200);
    expect(res.body.data.schedulingNote).toBe('Updated note');
    expect(mockUpdateJob).toHaveBeenCalledWith(
      JOB_ID,
      { schedulingNote: 'Updated note' },
      UserRole.Dispatcher,
      'user-1'
    );
  });

  it('TC-03: both dates null with non-empty schedulingNote → 200', async () => {
    const clearedJob = { ...mockJob, scheduledStart: null, scheduledEnd: null, schedulingNote: 'Awaiting reschedule' };
    mockUpdateJob.mockResolvedValueOnce(clearedJob);

    const res = await authedPatch(UserRole.Dispatcher, {
      scheduledStart: null,
      scheduledEnd: null,
      schedulingNote: 'Awaiting reschedule',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.scheduledStart).toBeNull();
    expect(res.body.data.scheduledEnd).toBeNull();
  });

  it('TC-06b: Admin role is also permitted → 200', async () => {
    mockUpdateJob.mockResolvedValueOnce(mockJob);

    const res = await authedPatch(UserRole.Admin, { scheduledStart: START, scheduledEnd: END });

    expect(res.status).toBe(200);
  });

  // ── Validation failures (400) ──────────────────────────────────────────────

  it('TC-04a: both dates null, schedulingNote null → 400 (business rule ②)', async () => {
    const res = await authedPatch(UserRole.Dispatcher, {
      scheduledStart: null,
      scheduledEnd: null,
      schedulingNote: null,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/schedulingNote/i);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it('TC-04b: both dates null, schedulingNote whitespace only → 400 (business rule ②)', async () => {
    const res = await authedPatch(UserRole.Dispatcher, {
      scheduledStart: null,
      scheduledEnd: null,
      schedulingNote: '   ',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/schedulingNote/i);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it('TC-05: scheduledEnd before scheduledStart → 400 (business rule ③)', async () => {
    const res = await authedPatch(UserRole.Dispatcher, {
      scheduledStart: START,
      scheduledEnd: BEFORE_START,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/scheduledEnd must be after scheduledStart/i);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it('TC-07: empty body {} → 400 (at least one field required)', async () => {
    const res = await authedPatch(UserRole.Dispatcher, {});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it('TC-08: non-ISO string for scheduledStart → 400', async () => {
    const res = await authedPatch(UserRole.Dispatcher, { scheduledStart: 'not-a-date' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/scheduledStart/i);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it('TC-08b: schedulingNote > 500 chars → 400', async () => {
    const res = await authedPatch(UserRole.Dispatcher, { schedulingNote: 'x'.repeat(501) });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/schedulingNote/i);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  // ── Authorization failures ─────────────────────────────────────────────────

  it('TC-09: Driver role → 403', async () => {
    const res = await authedPatch(UserRole.Driver, { scheduledStart: START, scheduledEnd: END });

    expect(res.status).toBe(403);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  it('TC-10: unauthenticated (no Authorization header) → 401', async () => {
    const res = await request(app)
      .patch(`/api/jobs/${JOB_ID}/schedule`)
      .send({ scheduledStart: START });

    expect(res.status).toBe(401);
    expect(mockUpdateJob).not.toHaveBeenCalled();
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it('TC-11: non-existent job ID → 404', async () => {
    mockUpdateJob.mockResolvedValueOnce(null);

    const res = await authedPatch(UserRole.Dispatcher, { scheduledStart: START, scheduledEnd: END });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Job not found');
  });

  // ── ID source ─────────────────────────────────────────────────────────────

  it('TC-12: job ID comes from route param, not body', async () => {
    mockUpdateJob.mockResolvedValueOnce(mockJob);

    mockVerifyAccessToken.mockReturnValueOnce({ userId: 'user-1', email: 'u@example.com', role: UserRole.Dispatcher });
    await request(app)
      .patch(`/api/jobs/${JOB_ID}/schedule`)
      .set('Authorization', 'Bearer valid-token')
      .send({ scheduledStart: START, scheduledEnd: END, id: 'some-other-id' });

    expect(mockUpdateJob).toHaveBeenCalledWith(
      JOB_ID,
      expect.not.objectContaining({ id: 'some-other-id' }),
      UserRole.Dispatcher,
      'user-1'
    );
  });
});
