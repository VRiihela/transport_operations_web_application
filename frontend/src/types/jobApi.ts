export type JobStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export interface AssignedDriver {
  id: string;
  name: string | null;
  email: string;
}

export interface CompletionReport {
  id: string;
  jobId: string;
  workDescription: string;
  actualStart: string;
  actualEnd: string;
  totalHours: number;
  customerName: string;
  customerSignature: string | null;
  noSignatureReason: string | null;
  approvedAt: string | null;
}

export interface Team {
  id: string;
  name: string;
}

export interface Job {
  id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  assignedDriverId: string | null;
  assignedDriver: AssignedDriver | null;
  teamId?: string | null;
  team?: Team | null;
  scheduledAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduleType: 'FIXED' | 'WINDOW' | 'DURATION';
  schedulingNote: string | null;
  driverNotes: string | null;
  street?: string | null;
  houseNumber?: string | null;
  stair?: string | null;
  postalCode?: string | null;
  city?: string | null;
  deliveryStreet?: string | null;
  deliveryHouseNumber?: string | null;
  deliveryStair?: string | null;
  deliveryPostalCode?: string | null;
  deliveryCity?: string | null;
  jobType?: string | null;
  services?: string[] | null;
  customer?: { id: string; name: string; phone: string; email: string | null; companyName: string | null } | null;
  location?: string | null;
  completionReport?: CompletionReport | null;
  createdAt: string;
  updatedAt: string;
}
