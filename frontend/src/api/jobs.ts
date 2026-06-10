import axiosInstance from './axios';

export interface JobCreatePayload {
  title: string;
  jobType: string;
  customerId?: string | null;
  description?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  schedulingNote?: string | null;
  services?: string[] | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  deliveryStreet?: string | null;
  deliveryPostalCode?: string | null;
  deliveryCity?: string | null;
  pickupStreet?: string | null;
  pickupPostalCode?: string | null;
  pickupCity?: string | null;
  floorStair?: string | null;
  doorCode?: string | null;
  accessNotes?: string | null;
  notes?: string | null;
}

export async function createJob(payload: JobCreatePayload): Promise<{ data: unknown }> {
  const response = await axiosInstance.post<{ data: unknown }>('/api/jobs', payload);
  return response.data;
}
