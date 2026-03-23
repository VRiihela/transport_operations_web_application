import { z } from 'zod';

const schedulingDateRefinement = (data: { scheduledStart?: string | null; scheduledEnd?: string | null }) => {
  if (data.scheduledStart && data.scheduledEnd) {
    return new Date(data.scheduledEnd) > new Date(data.scheduledStart);
  }
  return true;
};

export const createJobSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim(),
    description: z.string().max(1000, 'Description too long').trim().optional(),
    assignedDriverId: z.string().cuid().optional(),
    scheduledAt: z.string().datetime().optional(),
    scheduledStart: z.string().datetime().nullish(),
    scheduledEnd: z.string().datetime().nullish(),
    schedulingNote: z.string().trim().max(500).optional(),
    location: z.string().max(255, 'Location too long').trim().optional(),
    notes: z.string().max(1000, 'Notes too long').trim().optional(),
  })
  .refine(
    (data) => {
      if (data.scheduledStart != null || data.scheduledEnd != null) return true;
      return (data.schedulingNote?.trim().length ?? 0) > 0;
    },
    { message: 'schedulingNote is required when both scheduledStart and scheduledEnd are not provided', path: ['schedulingNote'] }
  )
  .refine(schedulingDateRefinement, {
    message: 'scheduledEnd must be after scheduledStart',
    path: ['scheduledEnd'],
  });

export const updateJobSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim().optional(),
    description: z.string().max(1000, 'Description too long').trim().optional(),
    status: z.enum(['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']).optional(),
    assignedDriverId: z.string().cuid().nullable().optional(),
    scheduledAt: z.string().datetime().nullable().optional(),
    scheduledStart: z.string().datetime().nullish(),
    scheduledEnd: z.string().datetime().nullish(),
    schedulingNote: z.string().trim().max(500).optional(),
    location: z.string().max(255, 'Location too long').trim().optional(),
    notes: z.string().max(1000, 'Notes too long').trim().optional(),
  })
  .refine(
    (data) => {
      // On update: only require note when explicitly clearing both times
      if (data.scheduledStart === null && data.scheduledEnd === null) {
        return (data.schedulingNote?.trim().length ?? 0) > 0;
      }
      return true;
    },
    { message: 'schedulingNote is required when clearing both scheduled times', path: ['schedulingNote'] }
  )
  .refine(schedulingDateRefinement, {
    message: 'scheduledEnd must be after scheduledStart',
    path: ['scheduledEnd'],
  });

export const jobQuerySchema = z.object({
  status: z.enum(['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  assignedDriverId: z.string().cuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const updateJobStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED']),
});

export const updateDriverNotesSchema = z.object({
  driverNotes: z.string().max(1000, 'Driver notes must not exceed 1000 characters'),
});

export type CreateJobRequest = z.infer<typeof createJobSchema>;
export type UpdateJobRequest = z.infer<typeof updateJobSchema>;
export type UpdateJobStatusRequest = z.infer<typeof updateJobStatusSchema>;
export type UpdateDriverNotesRequest = z.infer<typeof updateDriverNotesSchema>;
export type JobQuery = z.infer<typeof jobQuerySchema>;
