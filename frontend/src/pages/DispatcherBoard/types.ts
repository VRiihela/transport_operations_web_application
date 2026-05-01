export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  user: { id: string; name: string | null; email: string };
}

export interface Team {
  id: string;
  name: string;
  date: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
}

export interface Job {
  id: string;
  title: string;
  status: 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedDriverId: string | null;
  teamId?: string | null;
  sortOrder?: number;
  assignedDriver?: { id: string; name: string | null; email: string } | null;
  description?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  schedulingNote?: string | null;
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
  driverNotes?: string | null;
}

export interface Driver {
  id: string;
  name: string;
}
