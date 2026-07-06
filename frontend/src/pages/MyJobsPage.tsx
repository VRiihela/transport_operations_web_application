import React, { useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';
import { useLanguage } from '../i18n/LanguageContext';
import { downloadCompletionReportPdf } from '../utils/downloadPdf';
import { CompletionModal } from '../components/CompletionModal';
import styles from './MyJobsPage.module.css';

type JobStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

interface CompletionReport {
  id: string;
  jobId: string;
  workDescription: string;
  actualStart: string;
  actualEnd: string;
  totalHours: number;
  customerName: string;
  approvedAt: string | null;
}

interface Job {
  id: string;
  title: string;
  status: JobStatus;
  scheduledAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  schedulingNote: string | null;
  driverNotes: string | null;
  completionReport?: CompletionReport | null;
  // structured address (post-migration)
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
  // legacy field
  location?: string | null;
  notes: string | null;
  team?: { id: string; name: string } | null;
}

interface JobsApiResponse {
  data: {
    jobs: Job[];
    pagination: { page: number; limit: number; total: number; pages: number };
  };
}

function getApiError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const errField = (err.response?.data as { error?: string } | undefined)?.error;
    if (errField) return errField;
  }
  return fallback;
}

function debounce<T extends unknown[]>(fn: (...args: T) => void, delay: number): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayBounds(dateStr: string): { from: string; to: string } {
  const [year, month, day] = dateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

function isSameHelsinkiDate(isoString: string, dateStr: string): boolean {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' }) === dateStr;
}

function sortByScheduledStart(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    if (!a.scheduledStart && !b.scheduledStart) return 0;
    if (!a.scheduledStart) return 1;
    if (!b.scheduledStart) return -1;
    return new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime();
  });
}

const MyJobsPage: React.FC = () => {
  const { logout } = useAuth();
  const { t, fmtDateTime, fmtTime, statusLabel } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingJobs, setUpdatingJobs] = useState<Set<string>>(new Set());
  const [completionModalJob, setCompletionModalJob] = useState<Job | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [noteSaveStatus, setNoteSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [noteSaveError, setNoteSaveError] = useState<Record<string, string>>({});

  const fetchJobs = useCallback(async (date: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const { from, to } = getDayBounds(date);
      const response = await axiosInstance.get<JobsApiResponse>(
        `/api/jobs?scheduledFrom=${encodeURIComponent(from)}&scheduledTo=${encodeURIComponent(to)}&pageSize=100&includeCompleted=true`,
      );
      setJobs(sortByScheduledStart(response.data.data.jobs));
    } catch (err) {
      setError(getApiError(err, 'Failed to load jobs'));
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetchJobs = useCallback(debounce(fetchJobs, 300), [fetchJobs]);

  useEffect(() => {
    void fetchJobs(selectedDate);
  }, [fetchJobs]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const date = e.target.value;
    if (!date) return;
    setSelectedDate(date);
    debouncedFetchJobs(date);
  };

  const updateJobStatus = async (jobId: string, newStatus: 'IN_PROGRESS' | 'COMPLETED'): Promise<void> => {
    try {
      setUpdatingJobs((prev) => new Set([...prev, jobId]));
      setError(null);

      await axiosInstance.patch(`/api/jobs/${jobId}/status`, { status: newStatus });

      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job))
      );
    } catch (err) {
      setError(getApiError(err, 'Failed to update job status'));
    } finally {
      setUpdatingJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const saveDriverNotes = async (jobId: string, currentNotes: string | null): Promise<void> => {
    const notes = draftNotes[jobId] ?? currentNotes ?? '';
    setNoteSaveStatus((prev) => ({ ...prev, [jobId]: 'saving' }));
    setNoteSaveError((prev) => ({ ...prev, [jobId]: '' }));
    try {
      const response = await axiosInstance.patch<{ data: Job }>(`/api/jobs/${jobId}/notes`, { driverNotes: notes });
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, driverNotes: response.data.data.driverNotes } : j)));
      setNoteSaveStatus((prev) => ({ ...prev, [jobId]: 'saved' }));
      setTimeout(() => setNoteSaveStatus((prev) => ({ ...prev, [jobId]: 'idle' })), 2000);
    } catch (err) {
      setNoteSaveStatus((prev) => ({ ...prev, [jobId]: 'error' }));
      setNoteSaveError((prev) => ({ ...prev, [jobId]: getApiError(err, 'Failed to save notes') }));
    }
  };

  const formatSchedulingInfo = (start: string | null, end: string | null, note: string | null): string => {
    if (start || end) {
      if (start && end) {
        const sDate = new Date(start).toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' });
        const eDate = new Date(end).toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' });
        const s = fmtDateTime(start);
        const endPart = sDate === eDate ? fmtTime(end) : fmtDateTime(end);
        return `${s} – ${endPart}`;
      }
      return fmtDateTime(start) || fmtDateTime(end);
    }
    return note ?? '—';
  };

  const formatAddress = (
    street?: string | null, houseNumber?: string | null, stair?: string | null,
    postalCode?: string | null, city?: string | null,
  ): string => {
    const streetPart = [street, houseNumber, stair].filter(Boolean).join(' ');
    const cityPart = [postalCode, city].filter(Boolean).join(' ');
    return [streetPart, cityPart].filter(Boolean).join(', ');
  };

  const visibleJobs = jobs.filter((job) => {
    if (job.status === 'COMPLETED' && job.completionReport?.actualEnd) {
      return isSameHelsinkiDate(job.completionReport.actualEnd, selectedDate);
    }
    if (job.scheduledStart) {
      return isSameHelsinkiDate(job.scheduledStart, selectedDate);
    }
    return selectedDate === todayISO();
  });

  const getStatusBadgeClass = (status: JobStatus): string => {
    switch (status) {
      case 'ASSIGNED':    return styles.statusAssigned;
      case 'IN_PROGRESS': return styles.statusInProgress;
      case 'COMPLETED':   return styles.statusCompleted;
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>{t.myJobsHeading}</h1>
        </div>
        <div className={styles.loading}>{t.loading}</div>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>{t.myJobsHeading}</h1>
          <button className={styles.logoutButton} onClick={() => void logout()}>{t.logout}</button>
        </div>
        <div className={styles.error}>
          {error}
          <button onClick={() => void fetchJobs(selectedDate)} className={styles.retryButton}>
            {t.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>{t.myJobsHeading}</h1>
        <div className={styles.headerRight}>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className={styles.datePicker}
            aria-label={t.schedDate}
          />
          <button className={styles.logoutButton} onClick={() => void logout()}>{t.logout}</button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
          <button className={styles.errorDismiss} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {visibleJobs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{t.myJobsEmptyDate}</p>
          <p>{t.myJobsEmptyHint}</p>
        </div>
      ) : (
        <div className={styles.jobsGrid}>
          {visibleJobs.map((job) => (
            <div
              key={job.id}
              className={`${styles.jobCard} ${job.status === 'COMPLETED' ? styles.completedJob : ''}`}
              data-testid={`job-card-${job.id}`}
            >
              <div className={styles.jobHeader}>
                <h3 className={styles.jobTitle}>{job.title}</h3>
                <div className={styles.jobHeaderRight}>
                  {job.team && (
                    <span className={styles.teamBadge}>{job.team.name}</span>
                  )}
                  <span className={`${styles.statusBadge} ${getStatusBadgeClass(job.status)}`}>
                    {statusLabel(job.status)}
                  </span>
                </div>
              </div>

              <div className={styles.jobDetails}>
                <div className={styles.jobDetail}>
                  <strong>{t.myJobsScheduled}:</strong>{' '}
                  {(job.scheduledStart || job.scheduledEnd)
                    ? formatSchedulingInfo(job.scheduledStart, job.scheduledEnd, null)
                    : '—'}
                </div>
                {job.schedulingNote && (
                  <div className={styles.jobDetail}>
                    <strong>{t.myJobsNote}:</strong> {job.schedulingNote}
                  </div>
                )}
                <div className={styles.jobDetail}>
                  <strong>{t.myJobsLocation}:</strong>{' '}
                  {job.street
                    ? <>
                        {formatAddress(job.street, job.houseNumber, job.stair, job.postalCode, job.city)}
                        {job.deliveryStreet && (
                          <><br />→ {formatAddress(job.deliveryStreet, job.deliveryHouseNumber, job.deliveryStair, job.deliveryPostalCode, job.deliveryCity)}</>
                        )}
                      </>
                    : (job.location ?? '—')}
                </div>
                {job.notes && (
                  <div className={styles.jobDetail}>
                    <strong>{t.myJobsNotes}:</strong> {job.notes}
                  </div>
                )}
              </div>

              <div className={styles.notesSection}>
                <label htmlFor={`notes-${job.id}`} className={styles.notesLabel}>{t.myJobsDriverNotes}</label>
                <textarea
                  id={`notes-${job.id}`}
                  value={draftNotes[job.id] ?? job.driverNotes ?? ''}
                  onChange={(e) => setDraftNotes((prev) => ({ ...prev, [job.id]: e.target.value }))}
                  disabled={job.status === 'COMPLETED' || noteSaveStatus[job.id] === 'saving'}
                  placeholder={job.status === 'COMPLETED' ? '' : t.myJobsNotesPlaceholder}
                  className={`${styles.notesTextarea} ${job.status === 'COMPLETED' ? styles.notesReadOnly : ''}`}
                  maxLength={1000}
                  rows={3}
                />
                <div className={styles.notesFooter}>
                  <span className={styles.charCount}>
                    {(draftNotes[job.id] ?? job.driverNotes ?? '').length}/1000
                  </span>
                  {job.status !== 'COMPLETED' && (
                    <button
                      className={styles.saveNotesButton}
                      onClick={() => void saveDriverNotes(job.id, job.driverNotes)}
                      disabled={
                        noteSaveStatus[job.id] === 'saving' ||
                        (draftNotes[job.id] ?? job.driverNotes ?? '') === (job.driverNotes ?? '')
                      }
                    >
                      {noteSaveStatus[job.id] === 'saving' ? t.myJobsSaving : t.myJobsSave}
                    </button>
                  )}
                </div>
                {noteSaveStatus[job.id] === 'saved' && (
                  <div className={styles.saveSuccess}>{t.myJobsSaved}</div>
                )}
                {noteSaveStatus[job.id] === 'error' && (
                  <div className={styles.saveError}>{noteSaveError[job.id]}</div>
                )}
              </div>

              {job.status !== 'COMPLETED' && (
                <div className={styles.jobActions} data-testid={`job-actions-${job.id}`}>
                  {job.status === 'ASSIGNED' && (
                    <button
                      onClick={() => void updateJobStatus(job.id, 'IN_PROGRESS')}
                      disabled={updatingJobs.has(job.id)}
                      className={styles.startButton}
                    >
                      {updatingJobs.has(job.id) ? t.myJobsStarting : t.myJobsStartJob}
                    </button>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    job.completionReport?.approvedAt ? (
                      <button
                        onClick={() => void updateJobStatus(job.id, 'COMPLETED')}
                        disabled={updatingJobs.has(job.id)}
                        className={styles.completeButton}
                      >
                        {updatingJobs.has(job.id) ? t.myJobsCompleting : t.myJobsMarkCompleted}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setCompletionModalJob(job); }}
                        className={styles.reportButton}
                      >
                        {t.myJobsCompleteJob}
                      </button>
                    )
                  )}
                </div>
              )}
              {job.completionReport?.approvedAt && (
                <div className={styles.jobActions}>
                  <button
                    onClick={() => {
                      void downloadCompletionReportPdf(job.id).catch(() => {
                        alert('Could not download report. It may have been unlocked or removed.');
                      });
                    }}
                    className={styles.downloadButton}
                  >
                    {t.downloadPdf}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {completionModalJob && (
        <CompletionModal
          job={completionModalJob}
          isOpen={true}
          onClose={() => setCompletionModalJob(null)}
          onApproved={() => {
            setCompletionModalJob(null);
            void fetchJobs(selectedDate);
          }}
        />
      )}
    </div>
  );
};

export default MyJobsPage;
