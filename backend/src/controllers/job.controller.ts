import { Response } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { JobService } from '../services/job.service';
import { createJobSchema, updateJobSchema, updateJobStatusSchema, jobQuerySchema } from '../types/job.types';
import { AuthenticatedRequest } from '../types/auth.types';

const jobService = new JobService(new PrismaClient());

export const createJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
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
    res.status(400).json({ error: 'Invalid query parameters', details: parsed.error.errors });
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
    res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
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
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateJobStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parsed = updateJobStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
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
    console.error('Update job status error:', error);
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
