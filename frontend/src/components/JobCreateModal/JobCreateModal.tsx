import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  JobType,
  JOB_TYPE_LABELS,
  ServiceType,
  SchedulingType,
  ScheduleType,
  ServicesData,
  AddressData,
  SchedulingData,
} from '../../types/job';
import { CustomerSearchResult } from '../../types/customer';
import type { Parcel } from '../../types/jobApi';
import { customerService } from '../../services/customerService';
import { createJob, createParcel } from '../../api/jobs';
import { useDebounce } from '../../hooks/useDebounce';
import { ServicesSection, AddressSection, SchedulingSection, ParcelsSection } from './sections';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './JobCreateModal.module.css';
import buttons from '../../styles/buttons.module.css';
import forms from '../../styles/forms.module.css';
import states from '../../styles/states.module.css';

interface CustomerData {
  id?: string;
  name: string;
  phone: string;
  companyName: string;
  type: 'PRIVATE' | 'BUSINESS';
}

interface JobCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** When provided (e.g. from a Week view day-column click), pre-fills scheduling to this date at 08:00. */
  initialDate?: Date;
}

const getDefaultServices = (jobType: JobType): ServiceType[] => {
  switch (jobType) {
    case JobType.DELIVERY:
      return [ServiceType.DELIVERY];
    case JobType.PICKUP:
      return [ServiceType.PICKUP_COLLECTION];
    case JobType.DELIVERY_AND_PICKUP:
      return [ServiceType.DELIVERY, ServiceType.PICKUP_COLLECTION];
    case JobType.INSTALLATION:
      return [ServiceType.INSTALLATION];
    default:
      return [];
  }
};

const createEmptyAddress = (): AddressData => ({
  street: '',
  houseNumber: '',
  postalCode: '',
  city: '',
  floorStair: '',
  doorCode: '',
  accessNotes: '',
});

/** Combines a date + time input pair into an ISO string, or null if either fails to parse. */
const toIsoLocal = (date: string, time: string): string | null => {
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const initialScheduling = (initialDate?: Date): SchedulingData => {
  if (initialDate) {
    return {
      type: SchedulingType.EXACT_TIME,
      date: format(initialDate, 'yyyy-MM-dd'),
      exactTime: '08:00',
      windowStart: '',
      windowEnd: '',
      schedulingNote: '',
    };
  }
  return {
    type: SchedulingType.TBC,
    date: '',
    exactTime: '',
    windowStart: '',
    windowEnd: '',
    schedulingNote: '',
  };
};

export const JobCreateModal: React.FC<JobCreateModalProps> = ({ isOpen, onClose, onSuccess, initialDate }) => {
  const { t } = useLanguage();
  const [jobType, setJobType] = useState<JobType>(JobType.DELIVERY);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [customerData, setCustomerData] = useState<CustomerData>({
    name: '',
    phone: '',
    companyName: '',
    type: 'PRIVATE',
  });

  const [phoneInput, setPhoneInput] = useState('');
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [services, setServices] = useState<ServicesData>({
    selectedServices: getDefaultServices(JobType.DELIVERY),
    otherServiceText: '',
  });
  const [pickupAddress, setPickupAddress] = useState<AddressData>(createEmptyAddress());
  const [deliveryAddress, setDeliveryAddress] = useState<AddressData>(createEmptyAddress());
  const [serviceAddress, setServiceAddress] = useState<AddressData>(createEmptyAddress());
  const [scheduling, setScheduling] = useState<SchedulingData>(() => initialScheduling(initialDate));
  const [parcels, setParcels] = useState<Parcel[]>([]);

  const debouncedPhone = useDebounce(phoneInput, 400);

  const handleCustomerSearch = useCallback(async (phone: string) => {
    if (phone.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

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
    setCustomerData({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      companyName: customer.companyName ?? '',
      type: customer.type,
    });
    setPhoneInput(customer.phone);
    setShowDropdown(false);
  };

  const handlePhoneChange = (value: string) => {
    setPhoneInput(value);
    setCustomerData((prev) => ({ ...prev, phone: value, id: undefined }));
    if (value.length === 0) {
      setShowDropdown(false);
      setSearchResults([]);
    }
  };

  const handleJobTypeChange = (type: JobType) => {
    setJobType(type);
    setServices((prev) => ({
      ...prev,
      selectedServices: getDefaultServices(type),
    }));
  };

  const handleClose = () => {
    setJobType(JobType.DELIVERY);
    setTitle('');
    setSubmitting(false);
    setSubmitError('');
    setCustomerData({ name: '', phone: '', companyName: '', type: 'PRIVATE' });
    setPhoneInput('');
    setSearchResults([]);
    setShowDropdown(false);
    setSearchError('');
    setServices({ selectedServices: getDefaultServices(JobType.DELIVERY), otherServiceText: '' });
    setPickupAddress(createEmptyAddress());
    setDeliveryAddress(createEmptyAddress());
    setServiceAddress(createEmptyAddress());
    setScheduling(initialScheduling());
    setParcels([]);
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!title.trim()) {
      setSubmitError(t.createTitleRequired);
      return;
    }

    const invalidParcel = parcels.find((p) => !p.description.trim());
    if (invalidParcel) {
      setSubmitError(t.parcelDescriptionRequired);
      return;
    }

    const hasPickup = services.selectedServices.includes(ServiceType.PICKUP_COLLECTION);
    const hasDelivery = services.selectedServices.includes(ServiceType.DELIVERY);
    const hasServiceAddress = !hasPickup && !hasDelivery && services.selectedServices.length > 0;

    let scheduledStart: string | null = null;
    let scheduledEnd: string | null = null;
    let schedulingNote: string | undefined;
    let scheduleType: ScheduleType | undefined;

    if (scheduling.type === SchedulingType.EXACT_TIME) {
      if (!scheduling.date) { setSubmitError(t.schedDateRequired); return; }
      const start = toIsoLocal(scheduling.date, scheduling.exactTime);
      if (!start) { setSubmitError('Start time is invalid. Please check the date and time.'); return; }
      scheduledStart = start;
      scheduleType = 'FIXED';
    } else if (scheduling.type === SchedulingType.ARRIVAL_WINDOW || scheduling.type === SchedulingType.DURATION) {
      if (!scheduling.date) { setSubmitError(t.schedDateRequired); return; }
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
        setSubmitError(t.schedArrivalWindowEndRequired);
        return;
      }
      scheduleType = scheduling.type === SchedulingType.ARRIVAL_WINDOW ? 'WINDOW' : 'DURATION';
    } else if (scheduling.type === SchedulingType.TBC) {
      schedulingNote = scheduling.schedulingNote || undefined;
    }

    const payload = {
      title: title.trim(),
      jobType,
      customerId: customerData.id ?? null,
      services: services.selectedServices,
      scheduledStart,
      scheduledEnd,
      scheduleType,
      schedulingNote,
      ...(hasDelivery && {
        deliveryStreet: deliveryAddress.street || undefined,
        deliveryHouseNumber: deliveryAddress.houseNumber || undefined,
        deliveryPostalCode: deliveryAddress.postalCode || undefined,
        deliveryCity: deliveryAddress.city || undefined,
        floorStair: deliveryAddress.floorStair || undefined,
        doorCode: deliveryAddress.doorCode || undefined,
        accessNotes: deliveryAddress.accessNotes || undefined,
      }),
      ...(hasPickup && {
        street: pickupAddress.street || undefined,
        houseNumber: pickupAddress.houseNumber || undefined,
        postalCode: pickupAddress.postalCode || undefined,
        city: pickupAddress.city || undefined,
        floorStair: pickupAddress.floorStair || undefined,
        doorCode: pickupAddress.doorCode || undefined,
        accessNotes: pickupAddress.accessNotes || undefined,
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
      const created = await createJob(payload);
      const newJobId = (created.data as { id: string }).id;
      if (parcels.length > 0) {
        await Promise.all(
          parcels.map((p) => createParcel(newJobId, { description: p.description.trim(), quantity: p.quantity }))
        );
      }
      onSuccess?.();
      handleClose();
    } catch {
      setSubmitError('Failed to create job. Please try again.');
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setScheduling(initialScheduling(initialDate));
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
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
          <h2>{t.createTitle}</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <div className={styles.inputGroup}>
              <label htmlFor="jobTitle">{t.createJobTitleLabel} <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                id="jobTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.createJobTitlePlaceholder}
                className={`${forms.input} ${submitError && !title.trim() ? styles.errorInput : ''}`}
                maxLength={255}
                disabled={submitting}
              />
            </div>
          </section>

          <section className={styles.section}>
            <h3>{t.createJobTypeLabel}</h3>
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
            <h3>{t.createCustomerLabel}</h3>

            <div className={styles.customerSearch}>
              <div className={styles.inputGroup}>
                <label htmlFor="phone">{t.createPhoneLabel}</label>
                <input
                  id="phone"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder={t.createPhonePlaceholder}
                  className={forms.input}
                  autoComplete="off"
                />
                {isSearching && <div className={styles.searchingIndicator}>{t.createSearching}</div>}
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
                <label htmlFor="customerName">{t.createCustomerName}</label>
                <input
                  id="customerName"
                  type="text"
                  value={customerData.name}
                  onChange={(e) => setCustomerData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t.createCustomerNamePlaceholder}
                  className={forms.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="companyName">{t.createCompanyName}</label>
                <input
                  id="companyName"
                  type="text"
                  value={customerData.companyName}
                  onChange={(e) => setCustomerData((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder={t.createCompanyNamePlaceholder}
                  className={forms.input}
                />
              </div>

              <div className={styles.customerTypeToggle}>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${customerData.type === 'PRIVATE' ? styles.active : ''}`}
                  onClick={() => setCustomerData((prev) => ({ ...prev, type: 'PRIVATE' }))}
                >
                  {t.createPrivate}
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${customerData.type === 'BUSINESS' ? styles.active : ''}`}
                  onClick={() => setCustomerData((prev) => ({ ...prev, type: 'BUSINESS' }))}
                >
                  {t.createBusiness}
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

          {submitError && (
            <div className={states.errorBanner}>{submitError}</div>
          )}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={`${buttons.btn} ${buttons.btnSecondary}`}
              onClick={handleClose}
              disabled={submitting}
            >
              {t.cancel}
            </button>
            <button
              type="button"
              className={`${buttons.btn} ${buttons.btnPrimary}`}
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? t.createSaving : t.createSaveJob}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
