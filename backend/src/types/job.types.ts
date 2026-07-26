import { z } from 'zod';
import { JobStatus, JobType, ScheduleType } from '@prisma/client';

const schedulingDateRefinement = (data: { scheduledStart?: string | null; scheduledEnd?: string | null }) => {
  if (data.scheduledStart && data.scheduledEnd) {
    return new Date(data.scheduledEnd) > new Date(data.scheduledStart);
  }
  return true;
};

function requireScheduledEndForWindow<
  T extends { scheduleType?: string | null | undefined; scheduledEnd?: string | Date | null | undefined }
>(data: T): boolean {
  if (data.scheduleType === ScheduleType.WINDOW) {
    return data.scheduledEnd !== null && data.scheduledEnd !== undefined;
  }
  return true;
}

export const createJobSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim(),
    description: z.string().max(1000, 'Description too long').trim().optional(),
    jobType: z.nativeEnum(JobType),
    assignedDriverId: z.string().cuid().optional(),
    teamId: z.string().cuid().optional(),
    customerId: z.string().cuid().nullish(),
    customerName: z.string().max(255, 'Customer name too long').trim().nullish(),
    customerPhone: z.string().max(50, 'Customer phone too long').trim().nullish(),
    services: z.array(z.string()).nullish(),
    scheduledAt: z.string().datetime().optional(),
    scheduledStart: z.string().datetime().nullish(),
    scheduledEnd: z.string().datetime().nullish(),
    scheduleType: z.nativeEnum(ScheduleType).optional(),
    schedulingNote: z.string().trim().max(500).optional(),
    location: z.string().max(255, 'Location too long').trim().optional(),
    notes: z.string().max(1000, 'Notes too long').trim().optional(),
    street: z.string().max(255).trim().optional(),
    houseNumber: z.string().max(50).trim().optional(),
    stair: z.string().max(50).trim().optional(),
    postalCode: z.string().max(20).trim().optional(),
    city: z.string().max(255).trim().optional(),
    deliveryStreet: z.string().max(255).trim().optional(),
    deliveryHouseNumber: z.string().max(50).trim().optional(),
    deliveryStair: z.string().max(50).trim().optional(),
    deliveryPostalCode: z.string().max(20).trim().optional(),
    deliveryCity: z.string().max(255).trim().optional(),
    pickupStreet: z.string().max(255).trim().nullish(),
    pickupPostalCode: z.string().max(20).trim().nullish(),
    pickupCity: z.string().max(255).trim().nullish(),
    floorStair: z.string().max(100).trim().nullish(),
    doorCode: z.string().max(50).trim().nullish(),
    accessNotes: z.string().max(500).trim().nullish(),
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
  })
  .refine(requireScheduledEndForWindow, {
    message: 'scheduledEnd is required when scheduleType is WINDOW',
    path: ['scheduledEnd'],
  })
  .refine(
    (data) => !(data.assignedDriverId && data.teamId),
    { message: 'Job cannot be assigned to both a driver and a team', path: ['teamId'] }
  );

export const updateJobSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255, 'Title too long').trim().optional(),
    description: z.string().max(1000, 'Description too long').trim().optional(),
    jobType: z.nativeEnum(JobType).optional(),
    status: z.enum(['DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']).optional(),
    assignedDriverId: z.string().cuid().nullable().optional(),
    teamId: z.string().cuid().nullable().optional(),
    customerId: z.string().cuid().nullish(),
    customerName: z.string().max(255, 'Customer name too long').trim().nullish(),
    customerPhone: z.string().max(50, 'Customer phone too long').trim().nullish(),
    sortOrder: z.number().int().optional(),
    services: z.array(z.string()).nullish(),
    scheduledAt: z.string().datetime().nullable().optional(),
    scheduledStart: z.string().datetime().nullish(),
    scheduledEnd: z.string().datetime().nullish(),
    scheduleType: z.nativeEnum(ScheduleType).optional(),
    schedulingNote: z.string().trim().max(500).optional(),
    location: z.string().max(255, 'Location too long').trim().optional(),
    notes: z.string().max(1000, 'Notes too long').trim().optional(),
    street: z.string().max(255).trim().optional(),
    houseNumber: z.string().max(50).trim().optional(),
    stair: z.string().max(50).trim().optional(),
    postalCode: z.string().max(20).trim().optional(),
    city: z.string().max(255).trim().optional(),
    deliveryStreet: z.string().max(255).trim().optional(),
    deliveryHouseNumber: z.string().max(50).trim().optional(),
    deliveryStair: z.string().max(50).trim().optional(),
    deliveryPostalCode: z.string().max(20).trim().optional(),
    deliveryCity: z.string().max(255).trim().optional(),
    pickupStreet: z.string().max(255).trim().nullish(),
    pickupPostalCode: z.string().max(20).trim().nullish(),
    pickupCity: z.string().max(255).trim().nullish(),
    floorStair: z.string().max(100).trim().nullish(),
    doorCode: z.string().max(50).trim().nullish(),
    accessNotes: z.string().max(500).trim().nullish(),
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
  })
  .refine(requireScheduledEndForWindow, {
    message: 'scheduledEnd is required when scheduleType is WINDOW',
    path: ['scheduledEnd'],
  })
  .refine(
    (data) => !(data.assignedDriverId && data.teamId),
    { message: 'Job cannot be assigned to both a driver and a team', path: ['teamId'] }
  );

export const jobQuerySchema = z.object({
  status: z.nativeEnum(JobStatus).optional(),
  assignedDriverId: z.string().cuid().optional(),
  scheduledFrom: z.string().datetime().optional(),
  scheduledTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  includeCompleted: z.coerce.boolean().optional(),
  sortBy: z.enum(['title', 'status', 'driver', 'schedule']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
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

export const updateJobScheduleSchema = z
  .object({
    scheduledStart: z.string().datetime({ message: 'scheduledStart must be a valid ISO 8601 datetime string' }).nullish(),
    scheduledEnd: z.string().datetime({ message: 'scheduledEnd must be a valid ISO 8601 datetime string' }).nullish(),
    schedulingNote: z.string().max(500, { message: 'schedulingNote must not exceed 500 characters' }).nullish(),
  })
  .refine(
    (data) => data.scheduledStart !== undefined || data.scheduledEnd !== undefined || data.schedulingNote !== undefined,
    { message: 'At least one field (scheduledStart, scheduledEnd, schedulingNote) must be provided' }
  )
  .refine(
    (data) => {
      if (data.scheduledStart === null && data.scheduledEnd === null) {
        return typeof data.schedulingNote === 'string' && data.schedulingNote.trim().length > 0;
      }
      return true;
    },
    {
      message: 'schedulingNote must be a non-empty string when both scheduledStart and scheduledEnd are cleared to null',
      path: ['schedulingNote'],
    }
  )
  .refine(
    (data) => {
      if (data.scheduledStart != null && data.scheduledEnd != null) {
        return new Date(data.scheduledEnd) > new Date(data.scheduledStart);
      }
      return true;
    },
    {
      message: 'scheduledEnd must be after scheduledStart',
      path: ['scheduledEnd'],
    }
  );

export type UpdateJobScheduleInput = z.infer<typeof updateJobScheduleSchema>;

export interface JobWithDetails {
  id: string;
  status: JobStatus;
  jobType: JobType;
  scheduleType: ScheduleType;
  services: string[] | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  schedulingNote: string | null;
  assignedDriverId: string | null;
  teamId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  [key: string]: unknown;
}
