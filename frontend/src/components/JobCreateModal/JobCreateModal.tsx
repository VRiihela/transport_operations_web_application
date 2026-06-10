import React, { useState, useEffect, useCallback } from 'react';
import {
  JobType,
  JOB_TYPE_LABELS,
  ServiceType,
  SchedulingType,
  ServicesData,
  AddressData,
  SchedulingData,
} from '../../types/job';
import { CustomerSearchResult } from '../../types/customer';
import { customerService } from '../../services/customerService';
import { createJob } from '../../api/jobs';
import { useDebounce } from '../../hooks/useDebounce';
import { ServicesSection, AddressSection, SchedulingSection } from './sections';
import styles from './JobCreateModal.module.css';

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
  postalCode: '',
  city: '',
  floorStair: '',
  doorCode: '',
  accessNotes: '',
});

const initialScheduling = (): SchedulingData => ({
  type: SchedulingType.TBC,
  date: '',
  exactTime: '',
  windowStart: '',
  windowEnd: '',
  schedulingNote: '',
});

export const JobCreateModal: React.FC<JobCreateModalProps> = ({ isOpen, onClose, onSuccess }) => {
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
  const [scheduling, setScheduling] = useState<SchedulingData>(initialScheduling());

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
    onClose();
  };

  const handleSubmit = async () => {
    setSubmitError('');
    if (!title.trim()) {
      setSubmitError('Title is required');
      return;
    }

    const hasPickup = services.selectedServices.includes(ServiceType.PICKUP_COLLECTION);
    const hasDelivery = services.selectedServices.includes(ServiceType.DELIVERY);
    const hasServiceAddress = !hasPickup && !hasDelivery && services.selectedServices.length > 0;

    let scheduledStart: string | null = null;
    let scheduledEnd: string | null = null;
    let schedulingNote: string | undefined;

    if (scheduling.type === SchedulingType.EXACT_TIME && scheduling.date && scheduling.exactTime) {
      scheduledStart = new Date(`${scheduling.date}T${scheduling.exactTime}`).toISOString();
    } else if (scheduling.type === SchedulingType.TIME_WINDOW && scheduling.date) {
      if (scheduling.windowStart) scheduledStart = new Date(`${scheduling.date}T${scheduling.windowStart}`).toISOString();
      if (scheduling.windowEnd) scheduledEnd = new Date(`${scheduling.date}T${scheduling.windowEnd}`).toISOString();
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
      schedulingNote,
      ...(hasDelivery && {
        deliveryStreet: deliveryAddress.street || undefined,
        deliveryPostalCode: deliveryAddress.postalCode || undefined,
        deliveryCity: deliveryAddress.city || undefined,
        floorStair: deliveryAddress.floorStair || undefined,
        doorCode: deliveryAddress.doorCode || undefined,
        accessNotes: deliveryAddress.accessNotes || undefined,
      }),
      ...(hasPickup && {
        street: pickupAddress.street || undefined,
        postalCode: pickupAddress.postalCode || undefined,
        city: pickupAddress.city || undefined,
        floorStair: pickupAddress.floorStair || undefined,
        doorCode: pickupAddress.doorCode || undefined,
        accessNotes: pickupAddress.accessNotes || undefined,
      }),
      ...(hasServiceAddress && {
        street: serviceAddress.street || undefined,
        postalCode: serviceAddress.postalCode || undefined,
        city: serviceAddress.city || undefined,
        floorStair: serviceAddress.floorStair || undefined,
        doorCode: serviceAddress.doorCode || undefined,
        accessNotes: serviceAddress.accessNotes || undefined,
      }),
    };

    try {
      setSubmitting(true);
      await createJob(payload);
      onSuccess?.();
      handleClose();
    } catch {
      setSubmitError('Failed to create job. Please try again.');
      setSubmitting(false);
    }
  };

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
          <h2>Create New Job</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <section className={styles.section}>
            <div className={styles.inputGroup}>
              <label htmlFor="jobTitle">Title <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                id="jobTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Job title"
                className={`${styles.input} ${submitError && !title.trim() ? styles.errorInput : ''}`}
                maxLength={255}
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
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Search by phone number..."
                  className={styles.input}
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
                <label htmlFor="customerName">Name</label>
                <input
                  id="customerName"
                  type="text"
                  value={customerData.name}
                  onChange={(e) => setCustomerData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Customer name"
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="companyName">Company Name</label>
                <input
                  id="companyName"
                  type="text"
                  value={customerData.companyName}
                  onChange={(e) => setCustomerData((prev) => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Company name (optional)"
                  className={styles.input}
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
            <div className={styles.apiError}>{submitError}</div>
          )}

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.submitButton}
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Job'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
