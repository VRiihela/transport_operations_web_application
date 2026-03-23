import React, { useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';
import styles from './MyJobsPage.module.css';

type JobStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

interface Job {
  id: string;
  title: string;
  status: JobStatus;
  scheduledAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  schedulingNote: string | null;
  location: string | null;
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

  const formatSchedulingInfo = (start: string | null, end: string | null, note: string | null): string => {
    if (start || end) {
      const s = formatFinnishDateTime(start);
      const e = formatFinnishDateTime(end);
      if (s && e) return `${s} – ${e}`;
      return s || e;
    }
    return note ?? '—';
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
                  <strong>Location:</strong> {job.location ?? '—'}
                </div>
                {job.notes && (
                  <div className={styles.jobDetail}>
                    <strong>Notes:</strong> {job.notes}
                  </div>
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
                    <button
                      onClick={() => void updateJobStatus(job.id, 'COMPLETED')}
                      disabled={updatingJobs.has(job.id)}
                      className={styles.completeButton}
                    >
                      {updatingJobs.has(job.id) ? 'Completing...' : 'Complete Job'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyJobsPage;
