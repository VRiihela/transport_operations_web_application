import React, { useState, useRef } from 'react';
import { isAxiosError } from 'axios';
import axiosInstance from '../api/axios';
import { SignatureCanvas, SignatureCanvasHandle } from './SignatureCanvas';
import styles from './CompletionModal.module.css';

interface CompletionModalJob {
  id: string;
  title: string;
  scheduledStart: string | null;
  street?: string | null;
  houseNumber?: string | null;
  stair?: string | null;
  postalCode?: string | null;
  city?: string | null;
  location?: string | null;
}

interface CompletionModalProps {
  job: CompletionModalJob;
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
}

type ModalStep = 'report' | 'signature';

function formatFinnishDateTime(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('fi-FI', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

function formatFinnishTime(value: string): string {
  const d = new Date(value);
  return d.toLocaleTimeString('fi-FI', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

function formatTimeRange(start: string, end: string): string {
  const sDate = new Date(start).toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki' });
  const eDate = new Date(end).toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki' });
  const startFormatted = formatFinnishDateTime(start);
  const endPart = sDate === eDate ? formatFinnishTime(end) : formatFinnishDateTime(end);
  return `${startFormatted} – ${endPart}`;
}

function calculateTotalHours(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round((Math.abs(diff) / 36e5) * 100) / 100;
}

function formatAddress(job: CompletionModalJob): string {
  if (job.street) {
    const streetPart = [job.street, job.houseNumber, job.stair].filter(Boolean).join(' ');
    const cityPart = [job.postalCode, job.city].filter(Boolean).join(' ');
    return [streetPart, cityPart].filter(Boolean).join(', ');
  }
  return job.location ?? '';
}

function getApiError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const msg = (err.response?.data as { error?: string } | undefined)?.error;
    if (msg) return msg;
  }
  return fallback;
}

export const CompletionModal: React.FC<CompletionModalProps> = ({
  job,
  isOpen,
  onClose,
  onApproved,
}) => {
  const [step, setStep] = useState<ModalStep>('report');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workDescription, setWorkDescription] = useState('');
  const [actualStart, setActualStart] = useState(
    job.scheduledStart ? new Date(job.scheduledStart).toISOString().slice(0, 16) : ''
  );
  const [actualEnd, setActualEnd] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const signatureRef = useRef<SignatureCanvasHandle>(null);

  const endIsAfterStart =
    actualStart !== '' && actualEnd !== '' && new Date(actualEnd) > new Date(actualStart);
  const totalHours = endIsAfterStart ? calculateTotalHours(actualStart, actualEnd) : 0;

  const resetForm = () => {
    setStep('report');
    setError(null);
    setWorkDescription('');
    setActualStart(job.scheduledStart ? new Date(job.scheduledStart).toISOString().slice(0, 16) : '');
    setActualEnd('');
    setCustomerName('');
    setHasSignature(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleReportNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workDescription.trim() || !actualStart || !actualEnd) return;
    if (!endIsAfterStart) {
      setError('End time must be after start time');
      return;
    }
    setError(null);
    setStep('signature');
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !hasSignature) return;

    const signatureData = signatureRef.current?.getSignatureData();
    if (!signatureData) {
      setError('Please provide a signature');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await axiosInstance.post(`/api/jobs/${job.id}/completion-report`, {
        workDescription: workDescription.trim(),
        actualStart: new Date(actualStart).toISOString(),
        actualEnd: new Date(actualEnd).toISOString(),
        customerName: customerName.trim(),
        customerSignature: signatureData,
      });
      await axiosInstance.post(`/api/jobs/${job.id}/completion-report/approve`);
      resetForm();
      onApproved();
    } catch (err) {
      setError(getApiError(err, 'Failed to save completion report'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {step === 'report' ? 'Completion Report' : 'Customer Signature'}
          </h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        {step === 'report' && (
          <form onSubmit={handleReportNext}>
            <div className={styles.formGroup}>
              <label htmlFor="cr-workDescription" className={styles.label}>
                Work Description <span className={styles.required}>*</span>
              </label>
              <textarea
                id="cr-workDescription"
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                required
                maxLength={2000}
                rows={4}
                className={styles.textarea}
                placeholder="Describe the work performed…"
              />
            </div>
            <div className={styles.timeRow}>
              <div className={styles.formGroup}>
                <label htmlFor="cr-actualStart" className={styles.label}>
                  Actual Start <span className={styles.required}>*</span>
                </label>
                <input
                  id="cr-actualStart"
                  type="datetime-local"
                  value={actualStart}
                  onChange={(e) => setActualStart(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cr-actualEnd" className={styles.label}>
                  Actual End <span className={styles.required}>*</span>
                </label>
                <input
                  id="cr-actualEnd"
                  type="datetime-local"
                  value={actualEnd}
                  onChange={(e) => setActualEnd(e.target.value)}
                  required
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Total Hours</label>
              <input
                type="text"
                value={endIsAfterStart ? totalHours.toFixed(2) : '—'}
                readOnly
                className={`${styles.input} ${styles.readOnly}`}
              />
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={handleClose}>
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={!workDescription.trim() || !actualStart || !actualEnd || !endIsAfterStart}
              >
                Next: Signature
              </button>
            </div>
          </form>
        )}

        {step === 'signature' && (
          <div>
            <div className={styles.summary}>
              <h3 className={styles.summaryTitle}>Job Summary</h3>
              <div className={styles.summaryRow}>
                <strong>Job:</strong> {job.title}
              </div>
              {(job.street || job.location) && (
                <div className={styles.summaryRow}>
                  <strong>Address:</strong> {formatAddress(job)}
                </div>
              )}
              <div className={styles.summaryRow}>
                <strong>Work:</strong> {workDescription}
              </div>
              <div className={styles.summaryRow}>
                <strong>Time:</strong> {formatTimeRange(actualStart, actualEnd)}
              </div>
              <div className={styles.summaryRow}>
                <strong>Total:</strong> {totalHours.toFixed(2)} h
              </div>
            </div>

            <form onSubmit={(e) => void handleApproveSubmit(e)}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Customer Signature <span className={styles.required}>*</span>
                </label>
                <SignatureCanvas
                  ref={signatureRef}
                  onSignatureChange={setHasSignature}
                  width={500}
                  height={150}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="cr-customerName" className={styles.label}>
                  Customer Name <span className={styles.required}>*</span>
                </label>
                <input
                  id="cr-customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  maxLength={100}
                  className={styles.input}
                  placeholder="Enter customer name"
                />
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => { setStep('report'); setError(null); }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className={styles.approveButton}
                  disabled={loading || !customerName.trim() || !hasSignature}
                >
                  {loading ? 'Approving…' : 'Approve & Sign'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
