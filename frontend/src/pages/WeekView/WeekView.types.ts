import type { Job, JobStatus } from '../../types/jobApi';
import type { UserRole } from '../../types/auth.types';

export type { Job, JobStatus };

export interface DraggableJobData {
  job: Job;
}

export interface WeekDragError {
  jobId: string;
  message: string;
}

export function canDrag(role: UserRole, status: JobStatus): boolean {
  return (role === 'Admin' || role === 'Dispatcher') && status !== 'COMPLETED';
}
