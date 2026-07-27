export enum JobType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  DELIVERY_AND_PICKUP = 'DELIVERY_AND_PICKUP',
  INSTALLATION = 'INSTALLATION',
  SERVICE = 'SERVICE',
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  [JobType.DELIVERY]: 'Delivery',
  [JobType.PICKUP]: 'Pickup',
  [JobType.DELIVERY_AND_PICKUP]: 'Delivery & Pickup',
  [JobType.INSTALLATION]: 'Installation',
  [JobType.SERVICE]: 'Service',
};

export enum ServiceType {
  DELIVERY = 'DELIVERY',
  PICKUP_COLLECTION = 'PICKUP_COLLECTION',
  INSTALLATION = 'INSTALLATION',
  REMOVAL_DISPOSAL = 'REMOVAL_DISPOSAL',
  ASSEMBLY = 'ASSEMBLY',
  OTHER = 'OTHER',
}

export enum SchedulingType {
  EXACT_TIME = 'EXACT_TIME',
  ARRIVAL_WINDOW = 'ARRIVAL_WINDOW',
  DURATION = 'DURATION',
  TBC = 'TBC',
}

/**
 * Backend-persisted semantic tag for what scheduledStart/scheduledEnd mean.
 * FIXED = single exact appointment (scheduledEnd is expected to be null).
 * WINDOW = scheduledStart-scheduledEnd is a customer-promised arrival window.
 * DURATION = scheduledStart-scheduledEnd is the span the job occupies.
 * A plain string-literal union (not a TS enum) so it matches the Job.scheduleType
 * shape already used in jobApi.ts / DispatcherBoard/types.ts without a cast.
 */
export type ScheduleType = 'FIXED' | 'WINDOW' | 'DURATION';

export interface ServicesData {
  selectedServices: ServiceType[];
  otherServiceText: string;
}

export interface AddressData {
  street: string;
  postalCode: string;
  city: string;
  floorStair: string;
  doorCode: string;
  accessNotes: string;
}

export interface SchedulingData {
  type: SchedulingType;
  date: string;
  exactTime: string;
  windowStart: string;
  windowEnd: string;
  schedulingNote: string;
}

export interface JobCreateFormData {
  jobType: JobType;
  services: ServicesData;
  pickupAddress?: AddressData;
  deliveryAddress?: AddressData;
  serviceAddress?: AddressData;
  scheduling: SchedulingData;
}
