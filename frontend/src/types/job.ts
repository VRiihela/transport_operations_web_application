export enum JobType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  DELIVERY_AND_PICKUP = 'DELIVERY_AND_PICKUP',
  INSTALLATION = 'INSTALLATION',
  SERVICE = 'SERVICE',
  COMBINED = 'COMBINED',
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  [JobType.DELIVERY]: 'Delivery',
  [JobType.PICKUP]: 'Pickup',
  [JobType.DELIVERY_AND_PICKUP]: 'Delivery & Pickup',
  [JobType.INSTALLATION]: 'Installation',
  [JobType.SERVICE]: 'Service',
  [JobType.COMBINED]: 'Combined',
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
  TIME_WINDOW = 'TIME_WINDOW',
  TBC = 'TBC',
}

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
