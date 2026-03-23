import React, { useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';
import styles from './JobsPage.module.css';

type JobStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

interface AssignedDriver {
  id: string;
  name: string | null;
  email: string;
}

interface Job {
  id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  assignedDriverId: string | null;
  assignedDriver: AssignedDriver | null;
  scheduledAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  schedulingNote: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Driver {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
}

interface EditFormData {
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  schedulingNote: string;
  assignedDriverId: string;
}

interface CreateJobFormData {
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  schedulingNote: string;
  location: string;
}

interface JobsApiResponse {
  data: {
    jobs: Job[];
    pagination: { page: number; limit: number; total: number; pages: number };
  };
}

interface SingleJobApiResponse {
  data: Job;
}

interface UsersApiResponse {
  data: Driver[];
}

function getApiError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const msg = (err.response?.data as { error?: string } | undefined)?.error;
    if (msg) return msg;
  }
  return fallback;
}

const STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

const JobsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createFormData, setCreateFormData] = useState<CreateJobFormData>({
    title: '',
    description: '',
    scheduledStart: '',
    scheduledEnd: '',
    schedulingNote: '',
    location: '',
  });
  const [titleError, setTitleError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingDrivers, setLoadingDrivers] = useState<boolean>(false);
  const [assigningJobs, setAssigningJobs] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());
  const [openDriverDropdown, setOpenDriverDropdown] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ title: '', description: '', scheduledStart: '', scheduledEnd: '', schedulingNote: '', assignedDriverId: '' });
  const [editError, setEditError] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axiosInstance.get<JobsApiResponse>('/api/jobs');
      setJobs(response.data.data.jobs);
    } catch (err) {
      setError(getApiError(err, 'Failed to load jobs. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    if (drivers.length > 0) return;
    try {
      setLoadingDrivers(true);
      const response = await axiosInstance.get<UsersApiResponse>('/api/users?role=Driver');
      setDrivers(response.data.data);
    } catch {
      // Non-fatal — driver dropdown just won't populate
    } finally {
      setLoadingDrivers(false);
    }
  }, [drivers.length]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const handleOpenAssign = (jobId: string) => {
    setOpenDriverDropdown((prev) => (prev === jobId ? null : jobId));
    void fetchDrivers();
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError('');
    if (!createFormData.title.trim()) {
      setTitleError('Title is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: createFormData.title.trim(),
        description: createFormData.description.trim() || undefined,
        scheduledStart: createFormData.scheduledStart ? new Date(createFormData.scheduledStart).toISOString() : null,
        scheduledEnd: createFormData.scheduledEnd ? new Date(createFormData.scheduledEnd).toISOString() : null,
        schedulingNote: createFormData.schedulingNote.trim() || undefined,
        location: createFormData.location.trim() || undefined,
      };
      const response = await axiosInstance.post<SingleJobApiResponse>('/api/jobs', payload);
      setJobs((prev) => [response.data.data, ...prev]);
      setShowCreateForm(false);
      setCreateFormData({ title: '', description: '', scheduledStart: '', scheduledEnd: '', schedulingNote: '', location: '' });
    } catch (err) {
      setError(getApiError(err, 'Failed to create job. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignDriver = async (jobId: string, driverId: string) => {
    try {
      setAssigningJobs((prev) => new Set([...prev, jobId]));
      setOpenDriverDropdown(null);
      const response = await axiosInstance.patch<SingleJobApiResponse>(`/api/jobs/${jobId}`, {
        assignedDriverId: driverId,
      });
      setJobs((prev) => prev.map((job) => (job.id === jobId ? response.data.data : job)));
    } catch (err) {
      setError(getApiError(err, 'Failed to assign driver. Please try again.'));
    } finally {
      setAssigningJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleStatusUpdate = async (jobId: string, newStatus: JobStatus) => {
    const snapshot = [...jobs];
    try {
      setUpdatingStatus((prev) => new Set([...prev, jobId]));
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job))
      );
      const response = await axiosInstance.patch<SingleJobApiResponse>(`/api/jobs/${jobId}`, {
        status: newStatus,
      });
      setJobs((prev) => prev.map((job) => (job.id === jobId ? response.data.data : job)));
    } catch (err) {
      setJobs(snapshot);
      setError(getApiError(err, 'Failed to update status. Please try again.'));
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const formatDateTimeForInput = (value: string | null): string => {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
  };

  const handleEditOpen = (job: Job) => {
    void fetchDrivers();
    setEditForm({
      title: job.title,
      description: job.description ?? '',
      scheduledStart: formatDateTimeForInput(job.scheduledStart),
      scheduledEnd: formatDateTimeForInput(job.scheduledEnd),
      schedulingNote: job.schedulingNote ?? '',
      assignedDriverId: job.assignedDriverId ?? '',
    });
    setEditError('');
    setEditingJob(job);
  };

  const handleEditSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editingJob) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        scheduledStart: editForm.scheduledStart ? new Date(editForm.scheduledStart).toISOString() : null,
        scheduledEnd: editForm.scheduledEnd ? new Date(editForm.scheduledEnd).toISOString() : null,
        schedulingNote: editForm.schedulingNote.trim() || undefined,
        assignedDriverId: editForm.assignedDriverId || undefined,
      };
      const response = await axiosInstance.patch<SingleJobApiResponse>(`/api/jobs/${editingJob.id}`, payload);
      setJobs((prev) => prev.map((j) => (j.id === editingJob.id ? response.data.data : j)));
      setEditingJob(null);
    } catch (err) {
      setEditError(getApiError(err, 'Failed to save changes'));
    } finally {
      setEditSubmitting(false);
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

  const driverLabel = (driver: AssignedDriver): string =>
    driver.name ?? driver.email;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>Loading jobs…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Jobs Management</h1>
        <div className={styles.headerActions}>
          {user?.role === 'Admin' && (
            <Link to="/users" className={styles.usersLink}>Users</Link>
          )}
          <button className={styles.createButton} onClick={() => setShowCreateForm(true)}>
            Create Job
          </button>
          <button className={styles.logoutButton} onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
          <button className={styles.errorDismiss} onClick={() => setError('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateForm(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New Job</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowCreateForm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={(e) => void handleCreateJob(e)} className={styles.form} noValidate>
              <div className={styles.formGroup}>
                <label htmlFor="title" className={styles.formLabel}>
                  Title <span className={styles.required}>*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={createFormData.title}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className={`${styles.formInput} ${titleError ? styles.inputError : ''}`}
                  maxLength={200}
                />
                {titleError && <span className={styles.fieldError}>{titleError}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.formLabel}>
                  Description
                </label>
                <textarea
                  id="description"
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className={styles.formTextarea}
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="scheduledStart" className={styles.formLabel}>
                  Start Time
                </label>
                <input
                  id="scheduledStart"
                  type="datetime-local"
                  value={createFormData.scheduledStart}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, scheduledStart: e.target.value }))
                  }
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="scheduledEnd" className={styles.formLabel}>
                  End Time
                </label>
                <input
                  id="scheduledEnd"
                  type="datetime-local"
                  value={createFormData.scheduledEnd}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, scheduledEnd: e.target.value }))
                  }
                  className={styles.formInput}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="schedulingNote" className={styles.formLabel}>
                  Scheduling Note{!createFormData.scheduledStart && !createFormData.scheduledEnd && (
                    <span className={styles.required}> *</span>
                  )}
                </label>
                <input
                  id="schedulingNote"
                  type="text"
                  value={createFormData.schedulingNote}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, schedulingNote: e.target.value }))
                  }
                  className={styles.formInput}
                  maxLength={500}
                  placeholder={!createFormData.scheduledStart && !createFormData.scheduledEnd ? 'Required when no times set' : ''}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="location" className={styles.formLabel}>
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={createFormData.location}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  className={styles.formInput}
                  maxLength={500}
                />
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.submitButton} disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Job'}
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && (
        <div className={styles.modalOverlay} onClick={() => setEditingJob(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Job</h2>
              <button className={styles.modalClose} onClick={() => setEditingJob(null)} aria-label="Close">×</button>
            </div>
            <form onSubmit={(e) => void handleEditSubmit(e)} className={styles.form} noValidate>
              {editError && (
                <div className={styles.errorBanner} role="alert">
                  {editError}
                  <button className={styles.errorDismiss} onClick={() => setEditError('')}>×</button>
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="edit-title" className={styles.formLabel}>
                  Title <span className={styles.required}>*</span>
                </label>
                <input
                  id="edit-title"
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className={styles.formInput}
                  maxLength={255}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-description" className={styles.formLabel}>Description</label>
                <textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className={styles.formTextarea}
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="edit-scheduledStart" className={styles.formLabel}>Start Time</label>
                  <input
                    id="edit-scheduledStart"
                    type="datetime-local"
                    value={editForm.scheduledStart}
                    onChange={(e) => setEditForm((p) => ({ ...p, scheduledStart: e.target.value }))}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="edit-scheduledEnd" className={styles.formLabel}>End Time</label>
                  <input
                    id="edit-scheduledEnd"
                    type="datetime-local"
                    value={editForm.scheduledEnd}
                    onChange={(e) => setEditForm((p) => ({ ...p, scheduledEnd: e.target.value }))}
                    className={styles.formInput}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-schedulingNote" className={styles.formLabel}>
                  Scheduling Note{!editForm.scheduledStart && !editForm.scheduledEnd && (
                    <span className={styles.required}> *</span>
                  )}
                </label>
                <input
                  id="edit-schedulingNote"
                  type="text"
                  value={editForm.schedulingNote}
                  onChange={(e) => setEditForm((p) => ({ ...p, schedulingNote: e.target.value }))}
                  className={styles.formInput}
                  maxLength={500}
                  placeholder="Time to be agreed with customer"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="edit-driver" className={styles.formLabel}>Assigned Driver</label>
                <select
                  id="edit-driver"
                  value={editForm.assignedDriverId}
                  onChange={(e) => setEditForm((p) => ({ ...p, assignedDriverId: e.target.value }))}
                  className={styles.formInput}
                  disabled={loadingDrivers}
                >
                  <option value="">{loadingDrivers ? 'Loading…' : 'Unassigned'}</option>
                  {drivers.filter((d) => d.isActive).map((d) => (
                    <option key={d.id} value={d.id}>{d.name ?? d.email}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.submitButton} disabled={editSubmitting}>
                  {editSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" className={styles.cancelButton} onClick={() => setEditingJob(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No jobs yet. Create your first job to get started.</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Title</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Driver</th>
                <th className={styles.th}>Scheduled</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.jobTitle}>{job.title}</div>
                    {job.description && (
                      <div className={styles.jobDescription}>{job.description}</div>
                    )}
                    {job.location && (
                      <div className={styles.jobLocation}>📍 {job.location}</div>
                    )}
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${styles[`status${job.status.replace('_', '')}`]}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {job.assignedDriver ? driverLabel(job.assignedDriver) : (
                      <span className={styles.unassigned}>Unassigned</span>
                    )}
                  </td>
                  <td className={styles.td}>{formatSchedulingInfo(job.scheduledStart, job.scheduledEnd, job.schedulingNote)}</td>
                  <td className={styles.td}>
                    <div className={styles.actionGroup}>
                      {(job.status === 'DRAFT' || job.status === 'ASSIGNED') && (
                        <div className={styles.assignContainer}>
                          <button
                            className={styles.assignButton}
                            onClick={() => handleOpenAssign(job.id)}
                            disabled={assigningJobs.has(job.id)}
                          >
                            {assigningJobs.has(job.id) ? 'Assigning…' : 'Assign Driver'}
                          </button>
                          {openDriverDropdown === job.id && (
                            <select
                              className={styles.driverSelect}
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  void handleAssignDriver(job.id, e.target.value);
                                }
                              }}
                              disabled={loadingDrivers}
                            >
                              <option value="">
                                {loadingDrivers ? 'Loading…' : 'Select driver…'}
                              </option>
                              {drivers.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name ?? d.email}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      {STATUS_TRANSITIONS[job.status].map((next) => (
                        <button
                          key={next}
                          className={styles.statusButton}
                          onClick={() => void handleStatusUpdate(job.id, next)}
                          disabled={updatingStatus.has(job.id)}
                        >
                          {updatingStatus.has(job.id)
                            ? 'Updating…'
                            : `→ ${next.replace('_', ' ')}`}
                        </button>
                      ))}
                      <button
                        className={styles.editButton}
                        onClick={() => handleEditOpen(job)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JobsPage;
