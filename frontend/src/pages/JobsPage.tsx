import React, { useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { startOfWeek, addWeeks, subWeeks, addDays, format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';
import { PageNav } from '../components/PageNav';
import { JobDetailModal } from '../components/JobDetailModal';
import { JobCreateModal } from '../components/JobCreateModal/JobCreateModal';
import { JobEditModal, JobUpdatePayload } from '../components/JobEditModal';
import styles from './JobsPage.module.css';

type JobStatus = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

interface AssignedDriver {
  id: string;
  name: string | null;
  email: string;
}

interface CompletionReport {
  id: string;
  jobId: string;
  workDescription: string;
  actualStart: string;
  actualEnd: string;
  totalHours: number;
  customerName: string;
  customerSignature: string;
  approvedAt: string | null;
}

interface Team {
  id: string;
  name: string;
}

interface Job {
  id: string;
  title: string;
  description: string | null;
  status: JobStatus;
  assignedDriverId: string | null;
  assignedDriver: AssignedDriver | null;
  teamId?: string | null;
  team?: Team | null;
  scheduledAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  schedulingNote: string | null;
  driverNotes: string | null;
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
  jobType?: string | null;
  services?: string[] | null;
  customer?: { id: string; name: string; phone: string; email: string | null; companyName: string | null } | null;
  // legacy field
  location?: string | null;
  completionReport?: CompletionReport | null;
  createdAt: string;
  updatedAt: string;
}

interface Driver {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface JobsApiResponse {
  data: {
    jobs: Job[];
    pagination: Pagination;
  };
}

type StatusFilter = 'active' | 'COMPLETED' | 'all';
type ViewMode = 'list' | 'week';

interface SingleJobApiResponse {
  data: Job;
}

interface UsersApiResponse {
  data: Driver[];
}


function getWeekBounds(ws: Date): { from: string; to: string } {
  const sun = addDays(ws, 6);
  const from = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate(), 0, 0, 0, 0).toISOString();
  const to = new Date(sun.getFullYear(), sun.getMonth(), sun.getDate(), 23, 59, 59, 999).toISOString();
  return { from, to };
}

function getWeekdayLabel(scheduledStart: string | null): string {
  if (!scheduledStart) return '–';
  const d = new Date(scheduledStart);
  if (isNaN(d.getTime())) return '–';
  const parts = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Europe/Helsinki' }).formatToParts(d);
  const name = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const map: Record<string, string> = {
    Monday: 'Ma', Tuesday: 'Ti', Wednesday: 'Ke',
    Thursday: 'To', Friday: 'Pe', Saturday: 'La', Sunday: 'Su',
  };
  return map[name] ?? '–';
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
  const [loadingDrivers, setLoadingDrivers] = useState<boolean>(false);
  const [assigningJobs, setAssigningJobs] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());
  const [openDriverDropdown, setOpenDriverDropdown] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [datePickerValue, setDatePickerValue] = useState('');

  const fetchJobs = useCallback(async (filter: StatusFilter, p: number, mode: ViewMode, ws: Date): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filter === 'COMPLETED') params.set('status', 'COMPLETED');
      else if (filter === 'all') params.set('includeCompleted', 'true');
      if (mode === 'week') {
        const { from, to } = getWeekBounds(ws);
        params.set('scheduledFrom', from);
        params.set('scheduledTo', to);
        params.set('pageSize', '100');
        params.set('page', '1');
      } else {
        params.set('page', String(p));
        params.set('pageSize', '25');
      }
      const response = await axiosInstance.get<JobsApiResponse>(`/api/jobs?${params}`);
      setJobs(response.data.data.jobs);
      setPagination(response.data.data.pagination);
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
    void fetchJobs(statusFilter, page, viewMode, weekStart);
  }, [fetchJobs, statusFilter, page, viewMode, weekStart]);

  const handleFilterChange = (filter: StatusFilter): void => {
    setStatusFilter(filter);
    setPage(1);
  };

  const handleViewModeChange = (mode: ViewMode): void => {
    setViewMode(mode);
    setPage(1);
  };

  const handlePrevWeek = (): void => setWeekStart((w) => subWeeks(w, 1));
  const handleNextWeek = (): void => setWeekStart((w) => addWeeks(w, 1));

  const handleDatePicker = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setDatePickerValue(e.target.value);
    if (!e.target.value) return;
    const d = new Date(e.target.value + 'T00:00:00');
    if (!isNaN(d.getTime())) setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
  };

  const handleOpenAssign = (jobId: string) => {
    setOpenDriverDropdown((prev) => (prev === jobId ? null : jobId));
    void fetchDrivers();
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

  const handleEditOpen = (job: Job) => {
    setEditingJob(job);
  };

  const handleEditSave = async (updates: JobUpdatePayload): Promise<void> => {
    if (!editingJob) return;
    const response = await axiosInstance.patch<SingleJobApiResponse>(`/api/jobs/${editingJob.id}`, updates);
    setJobs((prev) => prev.map((j) => (j.id === editingJob.id ? response.data.data : j)));
    setEditingJob(null);
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

  const driverLabel = (driver: AssignedDriver): string =>
    driver.name ?? driver.email;

  const formatAddress = (
    street?: string | null, houseNumber?: string | null, stair?: string | null,
    postalCode?: string | null, city?: string | null,
  ): string => {
    const streetPart = [street, houseNumber, stair].filter(Boolean).join(' ');
    const cityPart = [postalCode, city].filter(Boolean).join(' ');
    return [streetPart, cityPart].filter(Boolean).join(', ');
  };

  const weekLabel = `${format(weekStart, 'd.M.')} – ${format(addDays(weekStart, 6), 'd.M.yyyy')}`;

  const displayJobs = viewMode === 'week'
    ? [...jobs].sort((a, b) => {
        const ta = a.scheduledStart ? new Date(a.scheduledStart).getTime() : Infinity;
        const tb = b.scheduledStart ? new Date(b.scheduledStart).getTime() : Infinity;
        return ta - tb;
      })
    : jobs;

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
        <PageNav />
        <div className={styles.headerActions}>
          {user?.role === 'Admin' && (
            <Link to="/users" className={styles.usersLink}>Users</Link>
          )}
          {(user?.role === 'Admin' || user?.role === 'Dispatcher') && (
            <button
              type="button"
              className={styles.newJobButton}
              onClick={() => setIsCreateModalOpen(true)}
            >
              New Job
            </button>
          )}
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

      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          {(['active', 'COMPLETED', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`${styles.filterButton} ${statusFilter === f ? styles.filterButtonActive : ''}`}
              onClick={() => handleFilterChange(f)}
            >
              {f === 'active' ? 'Active' : f === 'COMPLETED' ? 'Completed' : 'All'}
            </button>
          ))}
        </div>
        <div className={styles.viewToggle}>
          {(['list', 'week'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`${styles.viewBtn} ${viewMode === m ? styles.viewBtnActive : ''}`}
              onClick={() => handleViewModeChange(m)}
            >
              {m === 'list' ? 'List' : 'Week'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'week' && (
        <div className={styles.weekNav}>
          <button className={styles.navBtn} onClick={handlePrevWeek} aria-label="Previous week">←</button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button className={styles.navBtn} onClick={handleNextWeek} aria-label="Next week">→</button>
          <input
            type="date"
            className={styles.datePicker}
            value={datePickerValue}
            onChange={handleDatePicker}
            aria-label="Jump to week"
          />
        </div>
      )}

      {editingJob && (
        <JobEditModal
          job={editingJob}
          isOpen={true}
          onClose={() => setEditingJob(null)}
          onSave={handleEditSave}
        />
      )}

      {displayJobs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>
            {viewMode === 'week'
              ? `No jobs scheduled for ${weekLabel}.`
              : statusFilter === 'active'
                ? 'No active jobs. Create a new job to get started.'
                : statusFilter === 'COMPLETED'
                  ? 'No completed jobs.'
                  : 'No jobs found.'}
          </p>
        </div>
      ) : (
        <>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                {viewMode === 'week' && <th className={`${styles.th} ${styles.dayTh}`}>Day</th>}
                <th className={styles.th}>Title</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Driver</th>
                <th className={styles.th}>Scheduled</th>
                <th className={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayJobs.map((job) => (
                <tr key={job.id} className={styles.tr} onClick={() => setSelectedJob(job)} style={{ cursor: 'pointer' }}>
                  {viewMode === 'week' && (
                    <td className={`${styles.td} ${styles.dayTd}`}>{getWeekdayLabel(job.scheduledStart)}</td>
                  )}
                  <td className={styles.td}>
                    <div className={styles.jobTitle}>{job.title}</div>
                    {job.description && (
                      <div className={styles.jobDescription}>{job.description}</div>
                    )}
                    {(job.street || job.location) && (
                      <div className={styles.jobLocation}>
                        📍 {job.street
                          ? formatAddress(job.street, job.houseNumber, job.stair, job.postalCode, job.city)
                          : job.location}
                        {job.deliveryStreet && (
                          <div>→ {formatAddress(job.deliveryStreet, job.deliveryHouseNumber, job.deliveryStair, job.deliveryPostalCode, job.deliveryCity)}</div>
                        )}
                      </div>
                    )}
                    {job.driverNotes && job.driverNotes.trim() && (
                      <div className={styles.driverNotesDisplay}>
                        <span className={styles.driverNotesLabel}>Driver notes:</span> {job.driverNotes}
                      </div>
                    )}
                    {job.completionReport && (
                      <div className={styles.completionReport}>
                        <div className={styles.completionReportHeader}>
                          <span className={styles.completionReportTitle}>Completion Report</span>
                          {job.completionReport.approvedAt ? (
                            <span className={styles.approvedBadge}>
                              Approved {formatFinnishDateTime(job.completionReport.approvedAt)}
                            </span>
                          ) : (
                            <span className={styles.pendingBadge}>Pending approval</span>
                          )}
                        </div>
                        <div className={styles.completionReportRow}>
                          <strong>Work:</strong> {job.completionReport.workDescription}
                        </div>
                        <div className={styles.completionReportRow}>
                          <strong>Time:</strong>{' '}
                          {(() => {
                            const s = job.completionReport.actualStart;
                            const e = job.completionReport.actualEnd;
                            const sDate = new Date(s).toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki' });
                            const eDate = new Date(e).toLocaleDateString('fi-FI', { timeZone: 'Europe/Helsinki' });
                            return sDate === eDate
                              ? `${formatFinnishDateTime(s)} – ${formatFinnishTime(e)}`
                              : `${formatFinnishDateTime(s)} – ${formatFinnishDateTime(e)}`;
                          })()}
                        </div>
                        <div className={styles.completionReportRow}>
                          <strong>Hours:</strong> {job.completionReport.totalHours.toFixed(2)} h
                        </div>
                        <div className={styles.completionReportRow}>
                          <strong>Customer:</strong> {job.completionReport.customerName}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${styles[`status${job.status.replace('_', '')}`]}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {job.assignedDriver
                      ? driverLabel(job.assignedDriver)
                      : job.team
                        ? job.team.name
                        : <span className={styles.unassigned}>Unassigned</span>}
                  </td>
                  <td className={styles.td}>{formatSchedulingInfo(job.scheduledStart, job.scheduledEnd, job.schedulingNote)}</td>
                  <td className={styles.td} onClick={(e) => e.stopPropagation()}>
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
        {viewMode === 'list' && pagination && pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
            >
              Next →
            </button>
          </div>
        )}
        </>
      )}

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isOpen={true}
          onClose={() => setSelectedJob(null)}
          onEdit={() => { handleEditOpen(selectedJob); setSelectedJob(null); }}
        />
      )}

      <JobCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => void fetchJobs(statusFilter, 1, viewMode, weekStart)}
      />
    </div>
  );
};

export default JobsPage;
