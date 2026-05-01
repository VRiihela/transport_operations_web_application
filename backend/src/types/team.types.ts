import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  date: z.string().min(1, 'Date is required'),
  driverIds: z.array(z.string().min(1)).min(1, 'At least one driver is required'),
});

export const updateTeamSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    driverIds: z.array(z.string().cuid()).min(1).optional(),
  })
  .refine((d) => d.name !== undefined || d.driverIds !== undefined, {
    message: 'At least name or driverIds must be provided',
  });

export const teamQuerySchema = z.object({
  date: z.string().min(1, 'Date is required'),
});

export type CreateTeamRequest = z.infer<typeof createTeamSchema>;
export type UpdateTeamRequest = z.infer<typeof updateTeamSchema>;
export type TeamQuery = z.infer<typeof teamQuerySchema>;
