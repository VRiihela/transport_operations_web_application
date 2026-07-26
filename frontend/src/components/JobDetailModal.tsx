import React, { useState } from 'react';
import { isAxiosError } from 'axios';
import axiosInstance from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { JOB_TYPE_LABELS, JobType } from '../types/job';
import { downloadCompletionReportPdf } from '../utils/downloadPdf';
import styles from './JobDetailModal.module.css';
import buttons from '../styles/buttons.module.css';

interface CompletionReport {
  id: string;
  workDescription: string;
  actualStart: string;
  actualEnd: string;
  totalHours: number;
  customerName: string;
  customerSignature: string | null;
  noSignatureReason: string | null;
  approvedAt: string | null;
}

function getApiError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const msg = (err.response?.data as { error?: string } | undefined)?.error;
    if (msg) return msg;
  }
  return fallback;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
}

export interface DetailJob {
  id: string;
  title: string;
  status: string;
  jobType?: string | null;
  services?: string[] | null;
  customer?: Customer | null;
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
  completionReport?: CompletionReport | null;
}

interface JobDetailModalProps {
  job: DetailJob;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onApproved?: () => void;
}

function formatAddress(
  street?: string | null, houseNumber?: string | null, stair?: string | null,
  postalCode?: string | null, city?: string | null,
): string {
  const streetPart = [street, houseNumber, stair].filter(Boolean).join(' ');
  const cityPart = [postalCode, city].filter(Boolean).join(' ');
  return [streetPart, cityPart].filter(Boolean).join(', ') || '—';
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, isOpen, onClose, onEdit, onApproved }) => {
  const { user } = useAuth();
  const { t, fmtDateTime, statusLabel } = useLanguage();
  const canEdit = onEdit && (user?.role === 'Admin' || user?.role === 'Dispatcher');
  const canApprove = user?.role === 'Admin' || user?.role === 'Dispatcher';

  const [approvedAt, setApprovedAt] = useState(job.completionReport?.approvedAt ?? null);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const handleApprove = async () => {
    setApproving(true);
    setApproveError(null);
    try {
      const res = await axiosInstance.post<{ data: { approvedAt: string | null } }>(
        `/api/jobs/${job.id}/completion-report/approve`
      );
      setApprovedAt(res.data.data.approvedAt);
      onApproved?.();
    } catch (err) {
      setApproveError(getApiError(err, 'Failed to approve completion report'));
    } finally {
      setApproving(false);
    }
  };

  const formatScheduling = (start?: string | null, end?: string | null, note?: string | null): string => {
    if (start || end) {
      const s = fmtDateTime(start ?? null, '—');
      const e = fmtDateTime(end ?? null, '—');
      return start && end ? `${s} – ${e}` : s !== '—' ? s : e;
    }
    return note ?? '—';
  };

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
          <h2 className={styles.modalTitle}>{t.detailHeading}</h2>
          <div className={styles.headerActions}>
            {canEdit && (
              <button className={`${buttons.btn} ${buttons.btnPrimary} ${buttons.btnSmall}`} onClick={onEdit}>
                {t.edit}
              </button>
            )}
            <button className={styles.closeButton} onClick={onClose} aria-label={t.close}>×</button>
          </div>
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

          {job.customer && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailCustomer}</dt>
              <dd className={styles.value}>
                {job.customer.companyName
                  ? `${job.customer.companyName} (${job.customer.name})`
                  : job.customer.name}
                {job.customer.phone && <> · {job.customer.phone}</>}
                {job.customer.email && <> · {job.customer.email}</>}
              </dd>
            </div>
          )}

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

          {(hasPickupAddress || job.street !== undefined) && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailPickupAddress}</dt>
              <dd className={styles.value}>
                {hasPickupAddress
                  ? formatAddress(job.street, job.houseNumber, job.stair, job.postalCode, job.city)
                  : '—'}
              </dd>
            </div>
          )}

          {(hasDeliveryAddress || job.deliveryStreet !== undefined) && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailDeliveryAddress}</dt>
              <dd className={styles.value}>
                {hasDeliveryAddress
                  ? formatAddress(job.deliveryStreet, job.deliveryHouseNumber, job.deliveryStair, job.deliveryPostalCode, job.deliveryCity)
                  : '—'}
              </dd>
            </div>
          )}

          {job.driverNotes != null && (
            <div className={styles.field}>
              <dt className={styles.label}>{t.detailDriverNotes}</dt>
              <dd className={styles.value}>{job.driverNotes || '—'}</dd>
            </div>
          )}
        </dl>

        {job.completionReport && (
          <div className={styles.completionSection}>
            <h3 className={styles.sectionTitle}>
              {t.detailCompletionSection}
              {approvedAt ? (
                <span className={styles.approvedBadge}>
                  {t.detailApproved} {fmtDateTime(approvedAt)}
                </span>
              ) : (
                <span className={styles.pendingBadge}>{t.detailPendingApproval}</span>
              )}
            </h3>
            <dl className={styles.fields}>
              <div className={styles.field}>
                <dt className={styles.label}>{t.detailWorkDone}</dt>
                <dd className={styles.value}>{job.completionReport.workDescription}</dd>
              </div>
              <div className={styles.field}>
                <dt className={styles.label}>{t.detailActualTime}</dt>
                <dd className={styles.value}>
                  {fmtDateTime(job.completionReport.actualStart)}
                  {' – '}
                  {fmtDateTime(job.completionReport.actualEnd)}
                </dd>
              </div>
              <div className={styles.field}>
                <dt className={styles.label}>{t.detailHours}</dt>
                <dd className={styles.value}>{job.completionReport.totalHours.toFixed(2)} h</dd>
              </div>
              <div className={styles.field}>
                <dt className={styles.label}>{t.detailCustomer}</dt>
                <dd className={styles.value}>{job.completionReport.customerName}</dd>
              </div>
              <div className={styles.field}>
                <dt className={styles.label}>{t.detailSignature}</dt>
                <dd className={styles.value}>
                  {job.completionReport.customerSignature ? (
                    <img
                      src={job.completionReport.customerSignature}
                      alt="Customer signature"
                      className={styles.signatureImage}
                    />
                  ) : (
                    <span className={styles.noSignature}>
                      {t.crNoSignature}
                      {job.completionReport.noSignatureReason && ` — ${job.completionReport.noSignatureReason}`}
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            {approveError && <div className={styles.approveError}>{approveError}</div>}
            <div className={styles.completionActions}>
              {approvedAt && (
                <button
                  className={`${buttons.btn} ${buttons.btnNeutral} ${styles.downloadButton}`}
                  onClick={() => {
                    void downloadCompletionReportPdf(job.id).catch(() => {
                      alert('Could not download report. It may have been unlocked or removed.');
                    });
                  }}
                >
                  {t.downloadPdf}
                </button>
              )}
              {!approvedAt && canApprove && (
                <button
                  className={`${buttons.btn} ${buttons.btnSuccess}`}
                  onClick={() => void handleApprove()}
                  disabled={approving}
                >
                  {approving ? t.crApproving : t.crApproveButton}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
