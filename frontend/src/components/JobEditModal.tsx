import React, { useState, useEffect } from 'react';
import styles from './JobEditModal.module.css';

interface Driver {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
}

interface Job {
  id: string;
  title: string;
  description?: string | null;
  status: 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedDriverId: string | null;
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
}

interface EditFormData {
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  schedulingNote: string;
  assignedDriverId: string;
  street: string;
  houseNumber: string;
  stair: string;
  postalCode: string;
  city: string;
  deliveryStreet: string;
  deliveryHouseNumber: string;
  deliveryStair: string;
  deliveryPostalCode: string;
  deliveryCity: string;
}

export interface JobUpdatePayload {
  title?: string;
  description?: string;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  schedulingNote?: string;
  assignedDriverId?: string;
  street?: string;
  houseNumber?: string;
  stair?: string;
  postalCode?: string;
  city?: string;
  deliveryStreet?: string;
  deliveryHouseNumber?: string;
  deliveryStair?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
}

interface JobEditModalProps {
  job: Job;
  drivers: Driver[];
  loadingDrivers?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: JobUpdatePayload) => Promise<void>;
}

function formatDateTimeForInput(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
}

export const JobEditModal: React.FC<JobEditModalProps> = ({
  job,
  drivers,
  loadingDrivers = false,
  isOpen,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<EditFormData>({
    title: '', description: '', scheduledStart: '', scheduledEnd: '',
    schedulingNote: '', assignedDriverId: '',
    street: '', houseNumber: '', stair: '', postalCode: '', city: '',
    deliveryStreet: '', deliveryHouseNumber: '', deliveryStair: '',
    deliveryPostalCode: '', deliveryCity: '',
  });
  const [showDelivery, setShowDelivery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && job) {
      setForm({
        title: job.title,
        description: job.description ?? '',
        scheduledStart: formatDateTimeForInput(job.scheduledStart ?? null),
        scheduledEnd: formatDateTimeForInput(job.scheduledEnd ?? null),
        schedulingNote: job.schedulingNote ?? '',
        assignedDriverId: job.assignedDriverId ?? '',
        street: job.street ?? '',
        houseNumber: job.houseNumber ?? '',
        stair: job.stair ?? '',
        postalCode: job.postalCode ?? '',
        city: job.city ?? '',
        deliveryStreet: job.deliveryStreet ?? '',
        deliveryHouseNumber: job.deliveryHouseNumber ?? '',
        deliveryStair: job.deliveryStair ?? '',
        deliveryPostalCode: job.deliveryPostalCode ?? '',
        deliveryCity: job.deliveryCity ?? '',
      });
      setShowDelivery(Boolean(
        job.deliveryStreet || job.deliveryHouseNumber || job.deliveryPostalCode || job.deliveryCity
      ));
      setError(null);
    }
  }, [isOpen, job]);

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required';
    if (!form.scheduledStart && !form.scheduledEnd && !form.schedulingNote.trim()) {
      return 'Scheduling note is required when no times are set';
    }
    if (form.scheduledStart && form.scheduledEnd) {
      if (new Date(form.scheduledEnd) <= new Date(form.scheduledStart)) {
        return 'End time must be after start time';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: JobUpdatePayload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        scheduledStart: form.scheduledStart ? new Date(form.scheduledStart).toISOString() : null,
        scheduledEnd: form.scheduledEnd ? new Date(form.scheduledEnd).toISOString() : null,
        schedulingNote: form.schedulingNote.trim() || undefined,
        assignedDriverId: form.assignedDriverId || undefined,
        street: form.street.trim() || undefined,
        houseNumber: form.houseNumber.trim() || undefined,
        stair: form.stair.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        city: form.city.trim() || undefined,
        ...(showDelivery && {
          deliveryStreet: form.deliveryStreet.trim() || undefined,
          deliveryHouseNumber: form.deliveryHouseNumber.trim() || undefined,
          deliveryStair: form.deliveryStair.trim() || undefined,
          deliveryPostalCode: form.deliveryPostalCode.trim() || undefined,
          deliveryCity: form.deliveryCity.trim() || undefined,
        }),
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const set = (field: keyof EditFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Edit Job</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="jej-title" className={styles.label}>
              Title <span className={styles.required}>*</span>
            </label>
            <input
              id="jej-title"
              type="text"
              value={form.title}
              onChange={set('title')}
              className={styles.input}
              maxLength={255}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="jej-description" className={styles.label}>Description</label>
            <textarea
              id="jej-description"
              value={form.description}
              onChange={set('description')}
              className={styles.textarea}
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className={styles.timeRow}>
            <div className={styles.formGroup}>
              <label htmlFor="jej-start" className={styles.label}>Start Time</label>
              <input
                id="jej-start"
                type="datetime-local"
                value={form.scheduledStart}
                onChange={set('scheduledStart')}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="jej-end" className={styles.label}>End Time</label>
              <input
                id="jej-end"
                type="datetime-local"
                value={form.scheduledEnd}
                onChange={set('scheduledEnd')}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="jej-note" className={styles.label}>
              Scheduling Note
              {!form.scheduledStart && !form.scheduledEnd && (
                <span className={styles.required}> *</span>
              )}
            </label>
            <input
              id="jej-note"
              type="text"
              value={form.schedulingNote}
              onChange={set('schedulingNote')}
              className={styles.input}
              maxLength={500}
              placeholder={!form.scheduledStart && !form.scheduledEnd ? 'Required when no times set' : ''}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="jej-driver" className={styles.label}>Assigned Driver</label>
            <select
              id="jej-driver"
              value={form.assignedDriverId}
              onChange={set('assignedDriverId')}
              className={styles.input}
              disabled={loadingDrivers}
            >
              <option value="">{loadingDrivers ? 'Loading…' : 'Unassigned'}</option>
              {drivers.filter((d) => d.isActive).map((d) => (
                <option key={d.id} value={d.id}>{d.name ?? d.email}</option>
              ))}
            </select>
          </div>

          <div className={styles.addressSection}>
            <div className={styles.addressSectionLabel}>Pickup address</div>
            <div className={styles.formGroup}>
              <label htmlFor="jej-street" className={styles.label}>Street</label>
              <input id="jej-street" type="text" value={form.street} onChange={set('street')} className={styles.input} maxLength={255} />
            </div>
            <div className={styles.timeRow}>
              <div className={styles.formGroup}>
                <label htmlFor="jej-houseNumber" className={styles.label}>House no.</label>
                <input id="jej-houseNumber" type="text" value={form.houseNumber} onChange={set('houseNumber')} className={styles.input} maxLength={20} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="jej-stair" className={styles.label}>Stair</label>
                <input id="jej-stair" type="text" value={form.stair} onChange={set('stair')} className={styles.input} maxLength={20} placeholder="Optional" />
              </div>
            </div>
            <div className={styles.timeRow}>
              <div className={styles.formGroup}>
                <label htmlFor="jej-postalCode" className={styles.label}>Postal code</label>
                <input id="jej-postalCode" type="text" value={form.postalCode} onChange={set('postalCode')} className={styles.input} maxLength={10} />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="jej-city" className={styles.label}>City</label>
                <input id="jej-city" type="text" value={form.city} onChange={set('city')} className={styles.input} maxLength={100} />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.deliveryToggle}>
              <input type="checkbox" checked={showDelivery} onChange={(e) => setShowDelivery(e.target.checked)} />
              Delivery address (optional)
            </label>
          </div>

          {showDelivery && (
            <div className={styles.addressSection}>
              <div className={styles.addressSectionLabel}>Delivery address</div>
              <div className={styles.formGroup}>
                <label htmlFor="jej-deliveryStreet" className={styles.label}>Street</label>
                <input id="jej-deliveryStreet" type="text" value={form.deliveryStreet} onChange={set('deliveryStreet')} className={styles.input} maxLength={255} />
              </div>
              <div className={styles.timeRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="jej-deliveryHouseNumber" className={styles.label}>House no.</label>
                  <input id="jej-deliveryHouseNumber" type="text" value={form.deliveryHouseNumber} onChange={set('deliveryHouseNumber')} className={styles.input} maxLength={20} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="jej-deliveryStair" className={styles.label}>Stair</label>
                  <input id="jej-deliveryStair" type="text" value={form.deliveryStair} onChange={set('deliveryStair')} className={styles.input} maxLength={20} placeholder="Optional" />
                </div>
              </div>
              <div className={styles.timeRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="jej-deliveryPostalCode" className={styles.label}>Postal code</label>
                  <input id="jej-deliveryPostalCode" type="text" value={form.deliveryPostalCode} onChange={set('deliveryPostalCode')} className={styles.input} maxLength={10} />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="jej-deliveryCity" className={styles.label}>City</label>
                  <input id="jej-deliveryCity" type="text" value={form.deliveryCity} onChange={set('deliveryCity')} className={styles.input} maxLength={100} />
                </div>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
