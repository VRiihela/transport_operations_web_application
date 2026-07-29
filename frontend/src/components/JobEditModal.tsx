import React, { useState, useEffect, useCallback } from 'react';
import {
  JobType,
  JOB_TYPE_LABELS,
  ServiceType,
  SchedulingType,
  ScheduleType,
  ServicesData,
  AddressData,
  SchedulingData,
} from '../types/job';
import { CustomerSearchResult } from '../types/customer';
import type { Parcel } from '../types/jobApi';
import { customerService } from '../services/customerService';
import { useDebounce } from '../hooks/useDebounce';
import { useLanguage } from '../i18n/LanguageContext';
import { ServicesSection, AddressSection, SchedulingSection, ParcelsSection } from './JobCreateModal/sections';
import styles from './JobCreateModal/JobCreateModal.module.css';
import buttons from '../styles/buttons.module.css';
import forms from '../styles/forms.module.css';
import states from '../styles/states.module.css';

interface Job {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  jobType?: string | null;
  services?: string[] | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  scheduleType: ScheduleType;
  schedulingNote?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  deliveryStreet?: string | null;
  deliveryHouseNumber?: string | null;
  deliveryPostalCode?: string | null;
  deliveryCity?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  parcels?: Parcel[];
}

interface CustomerData {
  id?: string;
  name: string;
  phone: string;
  companyName: string;
  type: 'PRIVATE' | 'BUSINESS';
}

export interface JobUpdatePayload {
  title?: string;
  jobType?: string;
  services?: string[];
  description?: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  scheduleType?: ScheduleType;
  schedulingNote?: string;
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  deliveryStreet?: string;
  deliveryHouseNumber?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  floorStair?: string;
  doorCode?: string;
  accessNotes?: string;
  customerName?: string | null;
  customerPhone?: string | null;
}

export interface ParcelChanges {
  added: { description: string; quantity: number }[];
  updated: { id: string; description: string; quantity: number }[];
  removed: string[];
}

interface JobEditModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: JobUpdatePayload) => Promise<void>;
  /**
   * Parcels are a separate task-04 sub-resource (POST/PATCH/DELETE /jobs/:id/parcels),
   * not part of the job PATCH payload, so they're reported as a diff and delegated
   * to the parent — same pattern as onSave for the rest of the job fields.
   */
  onSaveParcels?: (changes: ParcelChanges) => Promise<void>;
}

const getDefaultServices = (jobType: JobType): ServiceType[] => {
  switch (jobType) {
    case JobType.DELIVERY: return [ServiceType.DELIVERY];
    case JobType.PICKUP: return [ServiceType.PICKUP_COLLECTION];
    case JobType.DELIVERY_AND_PICKUP: return [ServiceType.DELIVERY, ServiceType.PICKUP_COLLECTION];
    case JobType.INSTALLATION: return [ServiceType.INSTALLATION];
    default: return [];
  }
};

const createEmptyAddress = (): AddressData => ({
  street: '', houseNumber: '', postalCode: '', city: '', floorStair: '', doorCode: '', accessNotes: '',
});

const parseJobType = (jt: string | null | undefined): JobType =>
  Object.values(JobType).includes(jt as JobType) ? (jt as JobType) : JobType.DELIVERY;

/** Combines a date + time input pair into an ISO string, or null if either fails to parse. */
const toIsoLocal = (date: string, time: string): string | null => {
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const parseServices = (raw: string[] | null | undefined, jobType: JobType): ServiceType[] => {
  if (raw && raw.length > 0) {
    return raw.filter((s) => Object.values(ServiceType).includes(s as ServiceType)) as ServiceType[];
  }
  return getDefaultServices(jobType);
};

const parseScheduling = (
  start?: string | null, end?: string | null, note?: string | null, scheduleType?: ScheduleType,
): SchedulingData => {
  if (start) {
    const d = new Date(start);
    const date = d.toLocaleDateString('sv');
    const startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    if (end) {
      const e = new Date(end);
      const endTime = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`;
      const type = scheduleType === 'WINDOW' ? SchedulingType.ARRIVAL_WINDOW : SchedulingType.DURATION;
      return { type, date, exactTime: '', windowStart: startTime, windowEnd: endTime, schedulingNote: '' };
    }
    return { type: SchedulingType.EXACT_TIME, date, exactTime: startTime, windowStart: '', windowEnd: '', schedulingNote: '' };
  }
  return { type: SchedulingType.TBC, date: '', exactTime: '', windowStart: '', windowEnd: '', schedulingNote: note ?? '' };
};

export const JobEditModal: React.FC<JobEditModalProps> = ({ job, isOpen, onClose, onSave, onSaveParcels }) => {
  const { t } = useLanguage();
  const [jobType, setJobType] = useState<JobType>(JobType.DELIVERY);
  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [customerData, setCustomerData] = useState<CustomerData>({ name: '', phone: '', companyName: '', type: 'PRIVATE' });
  const [phoneInput, setPhoneInput] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [services, setServices] = useState<ServicesData>({ selectedServices: [], otherServiceText: '' });
  const [pickupAddress, setPickupAddress] = useState<AddressData>(createEmptyAddress());
  const [deliveryAddress, setDeliveryAddress] = useState<AddressData>(createEmptyAddress());
  const [serviceAddress, setServiceAddress] = useState<AddressData>(createEmptyAddress());
  const [scheduling, setScheduling] = useState<SchedulingData>(parseScheduling());
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [originalParcels, setOriginalParcels] = useState<Parcel[]>([]);

  const debouncedPhone = useDebounce(phoneInput, 400);

  useEffect(() => {
    if (!isOpen) return;
    const jt = parseJobType(job.jobType);
    setJobType(jt);
    setTitle(job.title);
    setCustomerName(job.customerName ?? '');
    setCustomerPhone(job.customerPhone ?? '');
    const svc = parseServices(job.services, jt);
    setServices({ selectedServices: svc, otherServiceText: '' });
    const hasPickup = svc.includes(ServiceType.PICKUP_COLLECTION);
    const hasDelivery = svc.includes(ServiceType.DELIVERY);
    if (hasPickup) {
      setPickupAddress({ street: job.street ?? '', houseNumber: job.houseNumber ?? '', postalCode: job.postalCode ?? '', city: job.city ?? '', floorStair: '', doorCode: '', accessNotes: '' });
    } else {
      setPickupAddress(createEmptyAddress());
    }
    if (hasDelivery) {
      setDeliveryAddress({ street: job.deliveryStreet ?? '', houseNumber: job.deliveryHouseNumber ?? '', postalCode: job.deliveryPostalCode ?? '', city: job.deliveryCity ?? '', floorStair: '', doorCode: '', accessNotes: '' });
    } else {
      setDeliveryAddress(createEmptyAddress());
    }
    if (!hasPickup && !hasDelivery) {
      setServiceAddress({ street: job.street ?? '', houseNumber: job.houseNumber ?? '', postalCode: job.postalCode ?? '', city: job.city ?? '', floorStair: '', doorCode: '', accessNotes: '' });
    } else {
      setServiceAddress(createEmptyAddress());
    }
    setScheduling(parseScheduling(job.scheduledStart, job.scheduledEnd, job.schedulingNote, job.scheduleType));
    setCustomerData({ name: '', phone: '', companyName: '', type: 'PRIVATE' });
    setPhoneInput('');
    setSubmitError('');
    const jobParcels = job.parcels ?? [];
    setParcels(jobParcels);
    setOriginalParcels(jobParcels);
  }, [isOpen, job.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCustomerSearch = useCallback(async (phone: string) => {
    if (phone.length < 3) { setSearchResults([]); setShowDropdown(false); return; }
    setIsSearching(true);
    setSearchError('');
    try {
      const results = await customerService.searchByPhone(phone);
      setSearchResults(results.slice(0, 5));
      setShowDropdown(results.length > 0);
    } catch {
      setSearchError('Failed to search customers');
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedPhone !== phoneInput) return;
    void handleCustomerSearch(debouncedPhone);
  }, [debouncedPhone, handleCustomerSearch, phoneInput]);

  const handleCustomerSelect = (customer: CustomerSearchResult) => {
    setCustomerData({ id: customer.id, name: customer.name, phone: customer.phone, companyName: customer.companyName ?? '', type: customer.type });
    setPhoneInput(customer.phone);
    setShowDropdown(false);
  };

  const handlePhoneChange = (value: string) => {
    setPhoneInput(value);
    setCustomerData((prev) => ({ ...prev, phone: value, id: undefined }));
    if (value.length === 0) { setShowDropdown(false); setSearchResults([]); }
  };

  const handleJobTypeChange = (type: JobType) => {
    setJobType(type);
    setServices((prev) => ({ ...prev, selectedServices: getDefaultServices(type) }));
  };

  const handleClose = () => {
    setSubmitting(false);
    setSubmitError('');
    setPhoneInput('');
    setSearchResults([]);
    setShowDropdown(false);
    setSearchError('');
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!title.trim()) { setSubmitError('Title is required'); return; }

    const invalidParcel = parcels.find((p) => !p.description.trim());
    if (invalidParcel) { setSubmitError(t.parcelDescriptionRequired); return; }

    const hasPickup = services.selectedServices.includes(ServiceType.PICKUP_COLLECTION);
    const hasDelivery = services.selectedServices.includes(ServiceType.DELIVERY);
    const hasServiceAddress = !hasPickup && !hasDelivery && services.selectedServices.length > 0;

    let scheduledStart: string | null = null;
    let scheduledEnd: string | null = null;
    let schedulingNote: string | undefined;
    let scheduleType: ScheduleType | undefined;

    if (scheduling.type === SchedulingType.EXACT_TIME) {
      if (!scheduling.date) { setSubmitError('Please select a date.'); return; }
      const start = toIsoLocal(scheduling.date, scheduling.exactTime);
      if (!start) { setSubmitError('Start time is invalid. Please check the date and time.'); return; }
      scheduledStart = start;
      scheduleType = 'FIXED';
    } else if (scheduling.type === SchedulingType.ARRIVAL_WINDOW || scheduling.type === SchedulingType.DURATION) {
      if (!scheduling.date) { setSubmitError('Please select a date.'); return; }
      if (scheduling.windowStart) {
        const start = toIsoLocal(scheduling.date, scheduling.windowStart);
        if (!start) { setSubmitError('Start time is invalid. Please check the date and time.'); return; }
        scheduledStart = start;
      }
      if (scheduling.windowEnd) {
        const end = toIsoLocal(scheduling.date, scheduling.windowEnd);
        if (!end) { setSubmitError('End time is invalid. Please check the date and time.'); return; }
        scheduledEnd = end;
      }
      if (scheduling.type === SchedulingType.ARRIVAL_WINDOW && !scheduledEnd) {
        setSubmitError('An arrival window needs a latest-arrival time.');
        return;
      }
      scheduleType = scheduling.type === SchedulingType.ARRIVAL_WINDOW ? 'WINDOW' : 'DURATION';
    } else if (scheduling.type === SchedulingType.TBC) {
      schedulingNote = scheduling.schedulingNote || undefined;
    }

    const payload: JobUpdatePayload = {
      title: title.trim(),
      jobType,
      services: services.selectedServices,
      scheduledStart,
      scheduledEnd,
      scheduleType,
      schedulingNote,
      customerName: customerName.trim() || null,
      customerPhone: customerPhone.trim() || null,
      ...(hasPickup && {
        street: pickupAddress.street || undefined,
        houseNumber: pickupAddress.houseNumber || undefined,
        postalCode: pickupAddress.postalCode || undefined,
        city: pickupAddress.city || undefined,
        floorStair: pickupAddress.floorStair || undefined,
        doorCode: pickupAddress.doorCode || undefined,
        accessNotes: pickupAddress.accessNotes || undefined,
      }),
      ...(hasDelivery && {
        deliveryStreet: deliveryAddress.street || undefined,
        deliveryHouseNumber: deliveryAddress.houseNumber || undefined,
        deliveryPostalCode: deliveryAddress.postalCode || undefined,
        deliveryCity: deliveryAddress.city || undefined,
        floorStair: deliveryAddress.floorStair || undefined,
        doorCode: deliveryAddress.doorCode || undefined,
        accessNotes: deliveryAddress.accessNotes || undefined,
      }),
      ...(hasServiceAddress && {
        street: serviceAddress.street || undefined,
        houseNumber: serviceAddress.houseNumber || undefined,
        postalCode: serviceAddress.postalCode || undefined,
        city: serviceAddress.city || undefined,
        floorStair: serviceAddress.floorStair || undefined,
        doorCode: serviceAddress.doorCode || undefined,
        accessNotes: serviceAddress.accessNotes || undefined,
      }),
    };

    try {
      setSubmitting(true);
      await onSave(payload);

      const originalIds = new Set(originalParcels.map((p) => p.id));
      const currentIds = new Set(parcels.map((p) => p.id));
      const removed = originalParcels.filter((p) => !currentIds.has(p.id)).map((p) => p.id);
      const added = parcels
        .filter((p) => !originalIds.has(p.id))
        .map((p) => ({ description: p.description.trim(), quantity: p.quantity }));
      const updated = parcels.filter((p) => {
        const original = originalParcels.find((o) => o.id === p.id);
        return original && (original.description !== p.description.trim() || original.quantity !== p.quantity);
      }).map((p) => ({ id: p.id, description: p.description.trim(), quantity: p.quantity }));

      if (onSaveParcels && (added.length > 0 || updated.length > 0 || removed.length > 0)) {
        await onSaveParcels({ added, updated, removed });
      }

      handleClose();
    } catch {
      setSubmitError('Failed to save changes. Please try again.');
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Edit Job</h2>
          <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="Close modal">×</button>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <div className={styles.inputGroup}>
              <label htmlFor="edit-jobTitle">Title <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                id="edit-jobTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Job title"
                className={`${forms.input} ${submitError && !title.trim() ? styles.errorInput : ''}`}
                maxLength={255}
                disabled={submitting}
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3>Contact Details</h3>
            <div className={styles.inputGroup}>
              <label htmlFor="edit-job-customerName">Customer Name</label>
              <input
                id="edit-job-customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
                className={forms.input}
                maxLength={255}
                disabled={submitting}
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="edit-job-customerPhone">Customer Phone</label>
              <input
                id="edit-job-customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Customer phone"
                className={forms.input}
                maxLength={50}
                disabled={submitting}
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3>Job Type</h3>
            <div className={styles.jobTypeGroup}>
              {Object.values(JobType).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`${styles.jobTypeButton} ${jobType === type ? styles.active : ''}`}
                  onClick={() => handleJobTypeChange(type)}
                >
                  {JOB_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h3>Customer</h3>
            <div className={styles.customerSearch}>
              <div className={styles.inputGroup}>
                <label htmlFor="edit-phone">Phone Number</label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Search by phone number..."
                  className={forms.input}
                  autoComplete="off"
                />
                {isSearching && <div className={styles.searchingIndicator}>Searching...</div>}
              </div>
              {showDropdown && searchResults.length > 0 && (
                <div className={styles.dropdown}>
                  {searchResults.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className={styles.customerInfo}>
                        <div className={styles.customerName}>{customer.name}</div>
                        <div className={styles.customerDetails}>
                          {customer.phone}
                          {customer.companyName && ` • ${customer.companyName}`}
                          <span className={styles.customerType}>{customer.type}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchError && <div className={styles.errorMessage}>{searchError}</div>}
            </div>
            <div className={styles.customerForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="edit-customerName">Name</label>
                <input
                  id="edit-customerName"
                  type="text"
                  value={customerData.name}
                  onChange={(e) => setCustomerData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Customer name"
                  className={forms.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="edit-companyName">Company Name</label>
                <input
                  id="edit-companyName"
                  type="text"
                  value={customerData.companyName}
                  onChange={(e) => setCustomerData((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Company name (optional)"
                  className={forms.input}
                />
              </div>
              <div className={styles.customerTypeToggle}>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${customerData.type === 'PRIVATE' ? styles.active : ''}`}
                  onClick={() => setCustomerData((prev) => ({ ...prev, type: 'PRIVATE' }))}
                >
                  Private
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${customerData.type === 'BUSINESS' ? styles.active : ''}`}
                  onClick={() => setCustomerData((prev) => ({ ...prev, type: 'BUSINESS' }))}
                >
                  Business
                </button>
              </div>
            </div>
          </section>

          <ServicesSection jobType={jobType} data={services} onChange={setServices} />

          <ParcelsSection parcels={parcels} onChange={setParcels} />

          <AddressSection
            selectedServices={services.selectedServices}
            pickupAddress={pickupAddress}
            deliveryAddress={deliveryAddress}
            serviceAddress={serviceAddress}
            onPickupChange={setPickupAddress}
            onDeliveryChange={setDeliveryAddress}
            onServiceChange={setServiceAddress}
          />

          <SchedulingSection data={scheduling} onChange={setScheduling} />

          {submitError && <div className={states.errorBanner}>{submitError}</div>}

          <div className={styles.modalFooter}>
            <button type="button" className={`${buttons.btn} ${buttons.btnSecondary}`} onClick={handleClose} disabled={submitting}>
              Cancel
            </button>
            <button type="button" className={`${buttons.btn} ${buttons.btnPrimary}`} onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
