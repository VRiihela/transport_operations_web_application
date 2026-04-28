import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './JobDetailModal.module.css';

export interface DetailJob {
  id: string;
  title: string;
  status: string;
  description?: string | null;
  assignedDriverId?: string | null;
  assignedDriver?: { id: string; name: string | null; email: string } | null;
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

interface JobDetailModalProps {
  job: DetailJob;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

function formatFinnishDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('fi-FI', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

function formatAddress(
  street?: string | null, houseNumber?: string | null, stair?: string | null,
  postalCode?: string | null, city?: string | null,
): string {
  const streetPart = [street, houseNumber, stair].filter(Boolean).join(' ');
  const cityPart = [postalCode, city].filter(Boolean).join(' ');
  return [streetPart, cityPart].filter(Boolean).join(', ') || '—';
}

function formatScheduling(
  start?: string | null, end?: string | null, note?: string | null,
): string {
  if (start || end) {
    const s = formatFinnishDateTime(start);
    const e = formatFinnishDateTime(end);
    return start && end ? `${s} – ${e}` : s !== '—' ? s : e;
  }
  return note ?? '—';
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, isOpen, onClose, onEdit }) => {
  const { user } = useAuth();
  const canEdit = onEdit && (user?.role === 'Admin' || user?.role === 'Dispatcher');

  if (!isOpen) return null;

  const driverLabel = job.assignedDriver
    ? (job.assignedDriver.name ?? job.assignedDriver.email)
    : '—';

  const hasPickupAddress = job.street || job.postalCode || job.city;
  const hasDeliveryAddress = job.deliveryStreet || job.deliveryPostalCode || job.deliveryCity;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Job Details</h2>
          <div className={styles.headerActions}>
            {canEdit && (
              <button className={styles.editButton} onClick={onEdit}>
                Edit
              </button>
            )}
            <button className={styles.closeButton} onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        <dl className={styles.fields}>
          <div className={styles.field}>
            <dt className={styles.label}>Title</dt>
            <dd className={styles.value}>{job.title}</dd>
          </div>

          <div className={styles.field}>
            <dt className={styles.label}>Status</dt>
            <dd className={styles.value}>
              <span className={`${styles.badge} ${styles[`status${job.status}`]}`}>
                {job.status.replace('_', ' ')}
              </span>
            </dd>
          </div>

          {job.description != null && (
            <div className={styles.field}>
              <dt className={styles.label}>Description</dt>
              <dd className={styles.value}>{job.description || '—'}</dd>
            </div>
          )}

          <div className={styles.field}>
            <dt className={styles.label}>Assigned driver</dt>
            <dd className={styles.value}>{driverLabel}</dd>
          </div>

          <div className={styles.field}>
            <dt className={styles.label}>Scheduled</dt>
            <dd className={styles.value}>
              {formatScheduling(job.scheduledStart, job.scheduledEnd, job.schedulingNote)}
            </dd>
          </div>

          {(hasPickupAddress || job.street !== undefined) && (
            <div className={styles.field}>
              <dt className={styles.label}>Pickup address</dt>
              <dd className={styles.value}>
                {hasPickupAddress
                  ? formatAddress(job.street, job.houseNumber, job.stair, job.postalCode, job.city)
                  : '—'}
              </dd>
            </div>
          )}

          {(hasDeliveryAddress || job.deliveryStreet !== undefined) && (
            <div className={styles.field}>
              <dt className={styles.label}>Delivery address</dt>
              <dd className={styles.value}>
                {hasDeliveryAddress
                  ? formatAddress(job.deliveryStreet, job.deliveryHouseNumber, job.deliveryStair, job.deliveryPostalCode, job.deliveryCity)
                  : '—'}
              </dd>
            </div>
          )}

          {job.driverNotes != null && (
            <div className={styles.field}>
              <dt className={styles.label}>Driver notes</dt>
              <dd className={styles.value}>{job.driverNotes || '—'}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
};
