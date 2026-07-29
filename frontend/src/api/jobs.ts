import axiosInstance from './axios';
import type { Parcel } from '../types/jobApi';

export interface JobCreatePayload {
  title: string;
  jobType: string;
  customerId?: string | null;
  description?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  scheduleType?: string;
  schedulingNote?: string | null;
  services?: string[] | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  deliveryStreet?: string | null;
  deliveryHouseNumber?: string | null;
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

export interface ParcelPayload {
  description: string;
  quantity: number;
}

export async function createParcel(jobId: string, payload: ParcelPayload): Promise<{ data: Parcel }> {
  const response = await axiosInstance.post<{ data: Parcel }>(`/api/jobs/${jobId}/parcels`, payload);
  return response.data;
}

export async function updateParcel(
  jobId: string,
  parcelId: string,
  payload: Partial<ParcelPayload>
): Promise<{ data: Parcel }> {
  const response = await axiosInstance.patch<{ data: Parcel }>(`/api/jobs/${jobId}/parcels/${parcelId}`, payload);
  return response.data;
}

export async function deleteParcel(jobId: string, parcelId: string): Promise<void> {
  await axiosInstance.delete(`/api/jobs/${jobId}/parcels/${parcelId}`);
}
