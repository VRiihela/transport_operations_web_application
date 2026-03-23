import React, { useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';
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

const MyJobsPage: React.FC = () => {
  const { logout } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingJobs, setUpdatingJobs] = useState<Set<string>>(new Set());
  const [completionModalJob, setCompletionModalJob] = useState<Job | null>(null);
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [noteSaveStatus, setNoteSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});
  const [noteSaveError, setNoteSaveError] = useState<Record<string, string>>({});

  const fetchJobs = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get<JobsApiResponse>('/api/jobs');
      setJobs(response.data.data.jobs);
    } catch (err) {
      setError(getApiError(err, 'Failed to load jobs'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

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

  const formatFinnishDateTime = (value: string | null): string => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('fi-FI', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Helsinki',
    });
  };

  const formatFinnishTime = (value: string): string => {
    const d = new Date(value);
    return d.toLocaleTimeString('fi-FI', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Helsinki',
    });
  };

  const formatSchedulingInfo = (start: string | null, end: string | null, note: string | null): string => {
    if (start || end) {
      if (start && end) {
        const sDate = new Date(start).toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki' });
        const eDate = new Date(end).toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki' });
        const s = formatFinnishDateTime(start);
        const endPart = sDate === eDate ? formatFinnishTime(end) : formatFinnishDateTime(end);
        return `${s} – ${endPart}`;
      }
      return formatFinnishDateTime(start) || formatFinnishDateTime(end);
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
          <h1>My Jobs</h1>
        </div>
        <div className={styles.loading}>Loading your jobs...</div>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1>My Jobs</h1>
          <button className={styles.logoutButton} onClick={() => void logout()}>Logout</button>
        </div>
        <div className={styles.error}>
          {error}
          <button onClick={() => void fetchJobs()} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>My Jobs</h1>
        <button className={styles.logoutButton} onClick={() => void logout()}>Logout</button>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
          <button className={styles.errorDismiss} onClick={() => setError(null)}>×</button>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No jobs assigned to you at the moment.</p>
          <p>Check back later or contact your dispatcher if you expect to see jobs here.</p>
        </div>
      ) : (
        <div className={styles.jobsGrid}>
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`${styles.jobCard} ${job.status === 'COMPLETED' ? styles.completedJob : ''}`}
              data-testid={`job-card-${job.id}`}
            >
              <div className={styles.jobHeader}>
                <h3 className={styles.jobTitle}>{job.title}</h3>
                <span className={`${styles.statusBadge} ${getStatusBadgeClass(job.status)}`}>
                  {job.status}
                </span>
              </div>

              <div className={styles.jobDetails}>
                <div className={styles.jobDetail}>
                  <strong>Scheduled:</strong> {formatSchedulingInfo(job.scheduledStart, job.scheduledEnd, job.schedulingNote)}
                </div>
                <div className={styles.jobDetail}>
                  <strong>Location:</strong>{' '}
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
                    <strong>Notes:</strong> {job.notes}
                  </div>
                )}
              </div>

              <div className={styles.notesSection}>
                <label htmlFor={`notes-${job.id}`} className={styles.notesLabel}>Driver notes</label>
                <textarea
                  id={`notes-${job.id}`}
                  value={draftNotes[job.id] ?? job.driverNotes ?? ''}
                  onChange={(e) => setDraftNotes((prev) => ({ ...prev, [job.id]: e.target.value }))}
                  disabled={job.status === 'COMPLETED' || noteSaveStatus[job.id] === 'saving'}
                  placeholder={job.status === 'COMPLETED' ? '' : 'Add notes or deviation info…'}
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
                      {noteSaveStatus[job.id] === 'saving' ? 'Saving…' : 'Save'}
                    </button>
                  )}
                </div>
                {noteSaveStatus[job.id] === 'saved' && (
                  <div className={styles.saveSuccess}>Saved</div>
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
                      {updatingJobs.has(job.id) ? 'Starting...' : 'Start Job'}
                    </button>
                  )}
                  {job.status === 'IN_PROGRESS' && (
                    job.completionReport?.approvedAt ? (
                      <button
                        onClick={() => void updateJobStatus(job.id, 'COMPLETED')}
                        disabled={updatingJobs.has(job.id)}
                        className={styles.completeButton}
                      >
                        {updatingJobs.has(job.id) ? 'Completing...' : 'Mark Completed'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setCompletionModalJob(job)}
                        className={styles.reportButton}
                      >
                        Complete Job
                      </button>
                    )
                  )}
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
            void fetchJobs();
          }}
        />
      )}
    </div>
  );
};

export default MyJobsPage;
