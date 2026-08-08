import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import apiService from '../../../../services/api';
import { useLanguage } from '../../../../i18n/LanguageContext';
import { JOB_TYPE_LABELS, JobType } from '../../../../types/job';
import { Job, Driver } from '../../types';
import styles from './JobQuickLook.module.css';
import buttons from '../../../../styles/buttons.module.css';
import states from '../../../../styles/states.module.css';
import forms from '../../../../styles/forms.module.css';

type JobStatusType = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

const STATUS_TRANSITIONS: Record<JobStatusType, JobStatusType[]> = {
  DRAFT: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

interface JobQuickLookProps {
  job: Job;
  drivers: Driver[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAssignDriver: (jobId: string, driverId: string) => Promise<void>;
  onStatusChange: (jobId: string, newStatus: JobStatusType) => Promise<void>;
}

function toDatetimeLocal(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatAddress(
  street?: string | null, houseNumber?: string | null, stair?: string | null,
  postalCode?: string | null, city?: string | null,
): string {
  const streetPart = [street, houseNumber, stair].filter(Boolean).join(' ');
  const cityPart = [postalCode, city].filter(Boolean).join(' ');
  return [streetPart, cityPart].filter(Boolean).join(', ') || '—';
}

export const JobQuickLook: React.FC<JobQuickLookProps> = ({
  job, drivers, isOpen, onClose, onEdit, onAssignDriver, onStatusChange,
}) => {
  const { t, fmtDateTime, statusLabel } = useLanguage();
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [showDriverSelect, setShowDriverSelect] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [workDescription, setWorkDescription] = useState('');
  const [actualStart, setActualStart] = useState('');
  const [actualEnd, setActualEnd] = useState('');
  const [completeCustomerName, setCompleteCustomerName] = useState('');
  const [noSignatureReason, setNoSignatureReason] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setShowDriverSelect(false);
    setStatusError(null);
    setShowCompleteForm(false);
    setWorkDescription('');
    setActualStart(job.scheduledStart ? toDatetimeLocal(new Date(job.scheduledStart)) : toDatetimeLocal(new Date()));
    setActualEnd(toDatetimeLocal(new Date()));
    setCompleteCustomerName(job.customer?.name ?? job.customerName ?? '');
    setNoSignatureReason('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  if (!isOpen) return null;

  const formatScheduling = (start?: string | null, end?: string | null, note?: string | null): string => {
    if (start || end) {
      const s = fmtDateTime(start ?? null, '—');
      const e = fmtDateTime(end ?? null, '—');
      return start && end ? `${s} – ${e}` : s !== '—' ? s : e;
    }
    return note ?? '—';
  };

  const driverLabel = job.assignedDriver
    ? (job.assignedDriver.name ?? job.assignedDriver.email)
    : '—';

  const contact = job.customer
    ? [
        job.customer.companyName ? `${job.customer.companyName} (${job.customer.name})` : job.customer.name,
        job.customer.phone,
        job.customer.email,
      ].filter(Boolean).join(' · ')
    : [job.customerName, job.customerPhone].filter(Boolean).join(' · ') || '—';

  const hasPickupAddress = job.street || job.postalCode || job.city;
  const hasDeliveryAddress = job.deliveryStreet || job.deliveryPostalCode || job.deliveryCity;

  const handleAssignSelect = async (driverId: string): Promise<void> => {
    if (!driverId) return;
    setShowDriverSelect(false);
    setAssigning(true);
    try {
      await onAssignDriver(job.id, driverId);
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusClick = async (next: JobStatusType): Promise<void> => {
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      await onStatusChange(job.id, next);
    } catch (err) {
      const backendMessage = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : undefined;
      setStatusError(
        backendMessage?.includes('Completion report')
          ? t.jobsCompletionReportRequired
          : t.jobsStatusUpdateFailed,
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCompleteSubmit = async (): Promise<void> => {
    setCompleting(true);
    setStatusError(null);
    try {
      await apiService.axios.post(`/api/jobs/${job.id}/completion-report`, {
        workDescription: workDescription.trim(),
        actualStart: new Date(actualStart).toISOString(),
        actualEnd: new Date(actualEnd).toISOString(),
        customerName: completeCustomerName.trim(),
        customerSignature: null,
        noSignatureReason: noSignatureReason.trim(),
      });
      await apiService.axios.post(`/api/jobs/${job.id}/completion-report/approve`);
      await onStatusChange(job.id, 'COMPLETED');
      setShowCompleteForm(false);
    } catch (err) {
      const backendMessage = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : undefined;
      setStatusError(backendMessage ?? t.jobsStatusUpdateFailed);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.heading}>{t.detailHeading}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={t.close}>×</button>
        </div>

        <dl className={styles.fields}>
          <div className={styles.field}>
            <dt className={styles.label}>{t.colTitle}</dt>
            <dd className={styles.value}>{job.title}</dd>
          </div>

          <div className={styles.field}>
            <dt className={styles.label}>{t.colStatus}</dt>
            <dd className={styles.value}>
              <span className={`${styles.badge} ${styles[`status${job.status}`]}`}>
                {statusLabel(job.status)}
              </span>
            </dd>
          </div>

          {job.jobType && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailJobType}</dt>
              <dd className={styles.value}>
                {JOB_TYPE_LABELS[job.jobType as JobType] ?? job.jobType}
              </dd>
            </div>
          )}

          {job.services && job.services.length > 0 && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailServices}</dt>
              <dd className={styles.value}>{job.services.join(', ')}</dd>
            </div>
          )}

          <div className={styles.field}>
            <dt className={styles.label}>{t.detailCustomer}</dt>
            <dd className={styles.value}>{contact}</dd>
          </div>

          {job.description != null && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailDescription}</dt>
              <dd className={styles.value}>{job.description || '—'}</dd>
            </div>
          )}

          <div className={styles.field}>
            <dt className={styles.label}>{t.detailAssignedDriver}</dt>
            <dd className={styles.value}>{driverLabel}</dd>
          </div>

          <div className={styles.field}>
            <dt className={styles.label}>{t.detailScheduled}</dt>
            <dd className={styles.value}>
              {formatScheduling(job.scheduledStart, job.scheduledEnd, job.schedulingNote)}
            </dd>
          </div>

          {hasPickupAddress && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailPickupAddress}</dt>
              <dd className={styles.value}>
                {formatAddress(job.street, job.houseNumber, job.stair, job.postalCode, job.city)}
              </dd>
            </div>
          )}

          {hasDeliveryAddress && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailDeliveryAddress}</dt>
              <dd className={styles.value}>
                {formatAddress(job.deliveryStreet, job.deliveryHouseNumber, job.deliveryStair, job.deliveryPostalCode, job.deliveryCity)}
              </dd>
            </div>
          )}

          {job.driverNotes != null && job.driverNotes !== '' && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailDriverNotes}</dt>
              <dd className={styles.value}>{job.driverNotes}</dd>
            </div>
          )}
        </dl>

        {statusError && (
          <div className={states.errorBanner} onClick={(e) => e.stopPropagation()}>
            <span>{statusError}</span>
            <button
              type="button"
              className={states.errorDismiss}
              onClick={() => setStatusError(null)}
              aria-label={t.close}
            >
              ×
            </button>
          </div>
        )}

        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {(job.status === 'DRAFT' || job.status === 'ASSIGNED') && (
            <div className={styles.assignContainer}>
              <button
                className={`${buttons.btn} ${buttons.btnNeutral} ${buttons.btnSmall}`}
                onClick={(e) => { e.stopPropagation(); setShowDriverSelect((v) => !v); }}
                disabled={assigning}
              >
                {assigning ? t.jobsAssigning : t.jobsAssignDriver}
              </button>
              {showDriverSelect && (
                <select
                  className={styles.driverSelect}
                  value=""
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { void handleAssignSelect(e.target.value); }}
                >
                  <option value="">{t.jobsAssignDriver}</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {STATUS_TRANSITIONS[job.status].map((next) => (
            <button
              key={next}
              className={`${buttons.btn} ${buttons.btnPrimaryTint} ${buttons.btnSmall}`}
              onClick={(e) => { e.stopPropagation(); void handleStatusClick(next); }}
              disabled={updatingStatus}
            >
              {updatingStatus ? t.jobsUpdating : `→ ${statusLabel(next)}`}
            </button>
          ))}

          {job.status === 'IN_PROGRESS' && !showCompleteForm && (
            <button
              className={`${buttons.btn} ${buttons.btnNeutral} ${buttons.btnSmall}`}
              onClick={(e) => { e.stopPropagation(); setShowCompleteForm(true); }}
            >
              {t.jobsCompleteWithoutSignature}
            </button>
          )}

          <button
            className={`${buttons.btn} ${buttons.btnPrimary} ${buttons.btnSmall}`}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            {t.edit}
          </button>
        </div>

        {job.status === 'IN_PROGRESS' && showCompleteForm && (
          <form
            className={styles.completeForm}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); void handleCompleteSubmit(); }}
          >
            <div className={forms.formGroup}>
              <label className={forms.label} htmlFor="ql-workDescription">
                {t.reportWorkDescription}
              </label>
              <textarea
                id="ql-workDescription"
                className={forms.textarea}
                placeholder={t.reportWorkDescPlaceholder}
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                required
                disabled={completing}
              />
            </div>

            <div className={forms.formGroup}>
              <label className={forms.label} htmlFor="ql-actualStart">{t.reportActualStart}</label>
              <input
                id="ql-actualStart"
                type="datetime-local"
                className={forms.input}
                value={actualStart}
                onChange={(e) => setActualStart(e.target.value)}
                required
                disabled={completing}
              />
            </div>

            <div className={forms.formGroup}>
              <label className={forms.label} htmlFor="ql-actualEnd">{t.reportActualEnd}</label>
              <input
                id="ql-actualEnd"
                type="datetime-local"
                className={forms.input}
                value={actualEnd}
                onChange={(e) => setActualEnd(e.target.value)}
                required
                disabled={completing}
              />
            </div>

            <div className={forms.formGroup}>
              <label className={forms.label} htmlFor="ql-customerName">{t.reportCustomerName}</label>
              <input
                id="ql-customerName"
                type="text"
                className={forms.input}
                placeholder={t.reportCustomerNamePlaceholder}
                value={completeCustomerName}
                onChange={(e) => setCompleteCustomerName(e.target.value)}
                required
                disabled={completing}
              />
            </div>

            <div className={forms.formGroup}>
              <label className={forms.label} htmlFor="ql-noSignatureReason">{t.reportNoSignatureReason}</label>
              <textarea
                id="ql-noSignatureReason"
                className={forms.textarea}
                placeholder={t.reportNoSignatureReasonPlaceholder}
                value={noSignatureReason}
                onChange={(e) => setNoSignatureReason(e.target.value)}
                required
                disabled={completing}
              />
            </div>

            <div className={styles.completeFormActions}>
              <button
                type="submit"
                className={`${buttons.btn} ${buttons.btnPrimary} ${buttons.btnSmall}`}
                disabled={completing}
              >
                {completing ? t.reportApproving : t.jobsCompleteSubmit}
              </button>
              <button
                type="button"
                className={`${buttons.btn} ${buttons.btnSecondary} ${buttons.btnSmall}`}
                onClick={() => setShowCompleteForm(false)}
                disabled={completing}
              >
                {t.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
