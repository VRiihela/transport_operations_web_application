import { Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { JobService } from '../services/job.service';
import { createJobSchema, updateJobSchema, updateJobStatusSchema, jobQuerySchema, updateDriverNotesSchema } from '../types/job.types';
import { upsertCompletionReportSchema } from '../types/completion-report.types';
import { CompletionReportService } from '../services/completion-report.service';
import { AuthenticatedRequest } from '../types/auth.types';

const jobService = new JobService(new PrismaClient());
const completionReportService = new CompletionReportService(new PrismaClient());

export const createJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }

  try {
    const job = await jobService.createJob(parsed.data, req.user!.id);
    res.status(201).json({ data: job });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = jobQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }

  try {
    const result = await jobService.getJobs(parsed.data, req.user!.role as UserRole, req.user!.id);
    res.json({ data: result });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const jobs = await jobService.getMyJobs(req.user!.id);
    res.json({ data: jobs });
  } catch (error) {
    console.error('Get my jobs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getJobById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const job = await jobService.getJobById(req.params['id'] as string, req.user!.role as UserRole, req.user!.id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ data: job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = updateJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }

  try {
    const job = await jobService.updateJob(
      req.params['id'] as string,
      parsed.data,
      req.user!.role as UserRole,
      req.user!.id
    );
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ data: job });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid status transition')) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message === 'SCHEDULING_NOTE_REQUIRED') {
      res.status(400).json({ error: 'Scheduling note is required when no scheduled times are set' });
      return;
    }
    if (error instanceof Error && error.message === 'COMPLETION_REPORT_REQUIRED') {
      res.status(400).json({ error: 'Completion report with customer approval required before marking job as completed' });
      return;
    }
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateJobStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = updateJobStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }

  try {
    const job = await jobService.updateJob(
      req.params['id'] as string,
      { status: parsed.data.status },
      req.user!.role as UserRole,
      req.user!.id
    );
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ data: job });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid status transition')) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error instanceof Error && error.message === 'COMPLETION_REPORT_REQUIRED') {
      res.status(400).json({ error: 'Completion report with customer approval required before marking job as completed' });
      return;
    }
    console.error('Update job status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDriverNotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = updateDriverNotesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }

  try {
    const job = await jobService.updateDriverNotes(
      req.params['id'] as string,
      parsed.data.driverNotes,
      req.user!.id
    );
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ data: job });
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN') {
      res.status(403).json({ error: 'Only the assigned driver can update notes for this job' });
      return;
    }
    console.error('Update driver notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const upsertCompletionReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = upsertCompletionReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request data' });
    return;
  }

  try {
    const jobId = req.params['id'] as string;
    const canModify = await completionReportService.canModify(req.user!.id, req.user!.role as UserRole, jobId);
    if (!canModify) {
      res.status(403).json({ error: 'Not authorized to modify completion report for this job' });
      return;
    }
    const report = await completionReportService.upsert(jobId, req.user!.id, parsed.data);
    res.json({ data: report });
  } catch (error) {
    if (error instanceof Error && error.message === 'JOB_NOT_FOUND') {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    console.error('Upsert completion report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveCompletionReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const jobId = req.params['id'] as string;
    const canModify = await completionReportService.canModify(req.user!.id, req.user!.role as UserRole, jobId);
    if (!canModify) {
      res.status(403).json({ error: 'Not authorized to approve completion report for this job' });
      return;
    }
    const report = await completionReportService.approve(jobId);
    res.json({ data: report });
  } catch (error) {
    if (error instanceof Error && error.message === 'REPORT_NOT_FOUND') {
      res.status(404).json({ error: 'Completion report not found' });
      return;
    }
    if (error instanceof Error && error.message === 'SIGNATURE_REQUIRED') {
      res.status(400).json({ error: 'Customer signature is required for approval' });
      return;
    }
    console.error('Approve completion report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const job = await jobService.deleteJob(req.params['id'] as string);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({ data: { message: 'Job deleted successfully' } });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
