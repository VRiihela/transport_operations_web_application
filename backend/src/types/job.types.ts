import { z } from 'zod';

export const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim(),
  description: z.string().max(1000, 'Description too long').trim().optional(),
  assignedDriverId: z.string().cuid().optional(),
  scheduledAt: z.string().datetime().optional(),
  location: z.string().max(255, 'Location too long').trim().optional(),
  notes: z.string().max(1000, 'Notes too long').trim().optional(),
});

export const updateJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim().optional(),
  description: z.string().max(1000, 'Description too long').trim().optional(),
  status: z.enum(['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  assignedDriverId: z.string().cuid().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  location: z.string().max(255, 'Location too long').trim().optional(),
  notes: z.string().max(1000, 'Notes too long').trim().optional(),
});

export const jobQuerySchema = z.object({
  status: z.enum(['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  assignedDriverId: z.string().cuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CreateJobRequest = z.infer<typeof createJobSchema>;
export type UpdateJobRequest = z.infer<typeof updateJobSchema>;
export type JobQuery = z.infer<typeof jobQuerySchema>;
