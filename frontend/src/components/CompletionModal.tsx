import React, { useState, useRef } from 'react';
import { isAxiosError } from 'axios';
import axiosInstance from '../api/axios';
import { downloadCompletionReportPdf } from '../utils/downloadPdf';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { SignatureCanvas, SignatureCanvasHandle } from './SignatureCanvas';
import styles from './CompletionModal.module.css';
import buttons from '../styles/buttons.module.css';
import forms from '../styles/forms.module.css';
import states from '../styles/states.module.css';

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
  completionReport?: { approvedAt: string | null } | null;
}

interface CompletionModalProps {
  job: CompletionModalJob;
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
}

type ModalStep = 'report' | 'signature';


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
  const { user } = useAuth();
  const { t, fmtDateTime, fmtTime } = useLanguage();

  const formatTimeRange = (start: string, end: string): string => {
    const sDate = new Date(start).toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' });
    const eDate = new Date(end).toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' });
    const endPart = sDate === eDate ? fmtTime(end) : fmtDateTime(end);
    return `${fmtDateTime(start)} – ${endPart}`;
  };
  const [step, setStep] = useState<ModalStep>('report');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [approvedAt, setApprovedAt] = useState(job.completionReport?.approvedAt ?? null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const isLocked = approvedAt !== null;

  const handleUnlock = async () => {
    setUnlocking(true);
    setUnlockError(null);
    try {
      await axiosInstance.post(`/api/jobs/${job.id}/completion-report/unlock`);
      setApprovedAt(null);
    } catch (err) {
      setUnlockError(getApiError(err, 'Failed to unlock completion report'));
    } finally {
      setUnlocking(false);
    }
  };

  const [workDescription, setWorkDescription] = useState('');
  const [actualStart, setActualStart] = useState(
    job.scheduledStart ? new Date(job.scheduledStart).toISOString().slice(0, 16) : ''
  );
  const [actualEnd, setActualEnd] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [noSignature, setNoSignature] = useState(false);
  const [noSignatureReason, setNoSignatureReason] = useState('');
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
    setNoSignature(false);
    setNoSignatureReason('');
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
    if (!customerName.trim()) return;
    if (noSignature) {
      if (!noSignatureReason.trim()) return;
    } else if (!hasSignature) {
      return;
    }

    const signatureData = noSignature ? null : signatureRef.current?.getSignatureData();
    if (!noSignature && !signatureData) {
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
        noSignatureReason: noSignature ? noSignatureReason.trim() : null,
      });
      if (!noSignature) {
        await axiosInstance.post(`/api/jobs/${job.id}/completion-report/approve`);
      }
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
            {step === 'report' ? t.reportTitle : t.reportSignatureTitle}
          </h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label={t.close}>
            ×
          </button>
        </div>

        {isLocked && (
          <div className={styles.lockedBanner}>
            <span className={styles.lockedMessage}>{t.reportLocked}</span>
            {user?.role === 'Admin' && (
              <div className={styles.unlockSection}>
                <button
                  type="button"
                  className={styles.unlockButton}
                  onClick={() => void handleUnlock()}
                  disabled={unlocking}
                >
                  {unlocking ? t.reportUnlocking : t.reportUnlock}
                </button>
                {unlockError && <div className={styles.unlockError}>{unlockError}</div>}
              </div>
            )}
          </div>
        )}

        {isLocked && (
          <div className={styles.actions}>
            <button
              type="button"
              className={`${buttons.btn} ${buttons.btnNeutral}`}
              onClick={() => {
                void downloadCompletionReportPdf(job.id).catch(() => {
                  alert('Could not download report. It may have been unlocked or removed.');
                });
              }}
            >
              {t.downloadPdf}
            </button>
          </div>
        )}

        {error && <div className={states.errorBanner}>{error}</div>}

        {step === 'report' && (
          <form onSubmit={handleReportNext}>
            <div className={forms.formGroup}>
              <label htmlFor="cr-workDescription" className={forms.label}>
                {t.reportWorkDescription} <span className={forms.required}>*</span>
              </label>
              <textarea
                id="cr-workDescription"
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                required
                maxLength={2000}
                rows={4}
                className={forms.textarea}
                placeholder={t.reportWorkDescPlaceholder}
              />
            </div>
            <div className={styles.timeRow}>
              <div className={forms.formGroup}>
                <label htmlFor="cr-actualStart" className={forms.label}>
                  {t.reportActualStart} <span className={forms.required}>*</span>
                </label>
                <input
                  id="cr-actualStart"
                  type="datetime-local"
                  value={actualStart}
                  onChange={(e) => setActualStart(e.target.value)}
                  required
                  className={forms.input}
                />
              </div>
              <div className={forms.formGroup}>
                <label htmlFor="cr-actualEnd" className={forms.label}>
                  {t.reportActualEnd} <span className={forms.required}>*</span>
                </label>
                <input
                  id="cr-actualEnd"
                  type="datetime-local"
                  value={actualEnd}
                  onChange={(e) => setActualEnd(e.target.value)}
                  required
                  className={forms.input}
                />
              </div>
            </div>
            <div className={forms.formGroup}>
              <label className={forms.label}>{t.reportTotalHours}</label>
              <input
                type="text"
                value={endIsAfterStart ? totalHours.toFixed(2) : '—'}
                readOnly
                className={forms.input}
              />
            </div>
            <div className={styles.actions}>
              <button type="button" className={`${buttons.btn} ${buttons.btnSecondary}`} onClick={handleClose}>
                {t.cancel}
              </button>
              <button
                type="submit"
                className={`${buttons.btn} ${buttons.btnPrimary}`}
                disabled={isLocked || !workDescription.trim() || !actualStart || !actualEnd || !endIsAfterStart}
              >
                {t.reportNextSignature}
              </button>
            </div>
          </form>
        )}

        {step === 'signature' && (
          <div>
            <div className={styles.summary}>
              <h3 className={styles.summaryTitle}>{t.reportSummaryTitle}</h3>
              <div className={styles.summaryRow}>
                <strong>{t.reportSummaryJob}:</strong> {job.title}
              </div>
              {(job.street || job.location) && (
                <div className={styles.summaryRow}>
                  <strong>{t.reportSummaryAddress}:</strong> {formatAddress(job)}
                </div>
              )}
              <div className={styles.summaryRow}>
                <strong>{t.reportSummaryWork}:</strong> {workDescription}
              </div>
              <div className={styles.summaryRow}>
                <strong>{t.reportSummaryTime}:</strong> {formatTimeRange(actualStart, actualEnd)}
              </div>
              <div className={styles.summaryRow}>
                <strong>{t.reportSummaryTotal}:</strong> {totalHours.toFixed(2)} h
              </div>
            </div>

            <form onSubmit={(e) => void handleApproveSubmit(e)}>
              <div className={forms.formGroup}>
                <label className={styles.noSignatureToggle}>
                  <input
                    type="checkbox"
                    checked={noSignature}
                    onChange={(e) => { setNoSignature(e.target.checked); setError(null); }}
                  />
                  {t.reportNoSignatureToggle}
                </label>
              </div>
              {noSignature ? (
                <div className={forms.formGroup}>
                  <label htmlFor="cr-noSignatureReason" className={forms.label}>
                    {t.reportNoSignatureReason} <span className={forms.required}>*</span>
                  </label>
                  <textarea
                    id="cr-noSignatureReason"
                    value={noSignatureReason}
                    onChange={(e) => setNoSignatureReason(e.target.value)}
                    required
                    maxLength={500}
                    rows={3}
                    className={forms.textarea}
                    placeholder={t.reportNoSignatureReasonPlaceholder}
                  />
                </div>
              ) : (
                <div className={forms.formGroup}>
                  <label className={forms.label}>
                    {t.reportSignatureTitle} <span className={forms.required}>*</span>
                  </label>
                  <SignatureCanvas
                    ref={signatureRef}
                    onSignatureChange={setHasSignature}
                    width={500}
                    height={150}
                  />
                </div>
              )}
              <div className={forms.formGroup}>
                <label htmlFor="cr-customerName" className={forms.label}>
                  {t.reportCustomerName} <span className={forms.required}>*</span>
                </label>
                <input
                  id="cr-customerName"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  maxLength={100}
                  className={forms.input}
                  placeholder={t.reportCustomerNamePlaceholder}
                />
              </div>
              {noSignature && (
                <div className={styles.noSignatureNotice}>{t.reportNoSignatureNotice}</div>
              )}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${buttons.btn} ${buttons.btnSecondary}`}
                  onClick={() => { setStep('report'); setError(null); }}
                >
                  {t.back}
                </button>
                <button
                  type="submit"
                  className={`${buttons.btn} ${buttons.btnSuccess}`}
                  disabled={
                    isLocked ||
                    loading ||
                    !customerName.trim() ||
                    (noSignature ? !noSignatureReason.trim() : !hasSignature)
                  }
                >
                  {loading
                    ? t.reportApproving
                    : noSignature
                      ? t.reportSubmitNoSignature
                      : t.reportApproveSign}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
