import React, { useState, useEffect, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { startOfWeek, addWeeks, subWeeks, addDays, format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../api/axios';
import { useLanguage } from '../i18n/LanguageContext';
import { TopBar } from '../components/TopBar/TopBar';
import { JobDetailModal } from '../components/JobDetailModal';
import { JobCreateModal } from '../components/JobCreateModal/JobCreateModal';
import { JobEditModal, JobUpdatePayload, ParcelChanges } from '../components/JobEditModal';
import { WeekGrid } from './WeekView/WeekGrid';
import { createParcel, updateParcel, deleteParcel } from '../api/jobs';
import type { Job, JobStatus, AssignedDriver } from '../types/jobApi';
import styles from './JobsPage.module.css';
import buttons from '../styles/buttons.module.css';
import states from '../styles/states.module.css';

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
type SortField = 'title' | 'status' | 'driver' | 'schedule';
type SortDir = 'asc' | 'desc';

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
  const { user } = useAuth();
  const { t, fmtDateTime, fmtTime, statusLabel } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [loadingDrivers, setLoadingDrivers] = useState<boolean>(false);
  const [assigningJobs, setAssigningJobs] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());
  const [approvingReports, setApprovingReports] = useState<Set<string>>(new Set());
  const [openDriverDropdown, setOpenDriverDropdown] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialDate, setCreateModalInitialDate] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [datePickerValue, setDatePickerValue] = useState('');

  const fetchJobs = useCallback(async (filter: StatusFilter, p: number, mode: ViewMode, ws: Date, sb: SortField | null, sd: SortDir): Promise<void> => {
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
        if (sb) {
          params.set('sortBy', sb);
          params.set('sortDir', sd);
        }
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
    void fetchJobs(statusFilter, page, viewMode, weekStart, sortBy, sortDir);
  }, [fetchJobs, statusFilter, page, viewMode, weekStart, sortBy, sortDir]);

  const handleFilterChange = (filter: StatusFilter): void => {
    setStatusFilter(filter);
    setPage(1);
  };

  const handleViewModeChange = (mode: ViewMode): void => {
    setViewMode(mode);
    setPage(1);
  };

  const handleSort = (field: SortField): void => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
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

  const handleApproveReport = async (jobId: string) => {
    try {
      setApprovingReports((prev) => new Set([...prev, jobId]));
      const response = await axiosInstance.post<{ data: { approvedAt: string | null } }>(
        `/api/jobs/${jobId}/completion-report/approve`
      );
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId && job.completionReport
            ? { ...job, completionReport: { ...job.completionReport, approvedAt: response.data.data.approvedAt } }
            : job
        )
      );
    } catch (err) {
      setError(getApiError(err, 'Failed to approve completion report. Please try again.'));
    } finally {
      setApprovingReports((prev) => {
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

  const handleDayColumnClick = (day: Date): void => {
    setCreateModalInitialDate(day);
    setIsCreateModalOpen(true);
  };

  const handleEditSave = async (updates: JobUpdatePayload): Promise<void> => {
    if (!editingJob) return;
    const response = await axiosInstance.patch<SingleJobApiResponse>(`/api/jobs/${editingJob.id}`, updates);
    setJobs((prev) => prev.map((j) => (j.id === editingJob.id ? response.data.data : j)));
    setEditingJob(null);
  };

  const handleSaveParcels = async (changes: ParcelChanges): Promise<void> => {
    if (!editingJob) return;
    await Promise.all([
      ...changes.removed.map((parcelId) => deleteParcel(editingJob.id, parcelId)),
      ...changes.added.map((p) => createParcel(editingJob.id, p)),
      ...changes.updated.map((p) => updateParcel(editingJob.id, p.id, { description: p.description, quantity: p.quantity })),
    ]);
    void fetchJobs(statusFilter, page, viewMode, weekStart, sortBy, sortDir);
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

  const weekLabel = `${format(weekStart, t.dateDayMonth)} – ${format(addDays(weekStart, 6), t.dateDayMonthYear)}`;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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
        <div className={states.loadingState}>{t.jobsLoading}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <TopBar title={t.jobsHeading} />

      {error && (
        <div className={states.errorBanner} role="alert">
          {error}
          <button className={states.errorDismiss} onClick={() => setError('')} aria-label="Dismiss">
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
              {f === 'active' ? t.jobsFilterActive : f === 'COMPLETED' ? t.jobsFilterCompleted : t.jobsFilterAll}
            </button>
          ))}
        </div>
        <div className={styles.filterRight}>
          <div className={styles.viewToggle}>
            {(['list', 'week'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`${styles.viewBtn} ${viewMode === m ? styles.viewBtnActive : ''}`}
                onClick={() => handleViewModeChange(m)}
              >
                {m === 'list' ? t.jobsViewList : t.jobsViewWeek}
              </button>
            ))}
          </div>
          {(user?.role === 'Admin' || user?.role === 'Dispatcher') && (
            <button
              type="button"
              className={`${buttons.btn} ${buttons.btnPrimary}`}
              onClick={() => { setCreateModalInitialDate(null); setIsCreateModalOpen(true); }}
            >
              {t.jobsNewJob}
            </button>
          )}
        </div>
      </div>

      {viewMode === 'week' && (
        <div className={styles.weekNav}>
          <button className={styles.navBtn} onClick={handlePrevWeek} aria-label={t.prevWeek}>←</button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button className={styles.navBtn} onClick={handleNextWeek} aria-label={t.nextWeek}>→</button>
          <input
            type="date"
            lang="fi-FI"
            className={styles.datePicker}
            value={datePickerValue}
            onChange={handleDatePicker}
            aria-label={t.jumpToWeek}
          />
        </div>
      )}

      {editingJob && (
        <JobEditModal
          job={editingJob}
          isOpen={true}
          onClose={() => setEditingJob(null)}
          onSave={handleEditSave}
          onSaveParcels={handleSaveParcels}
        />
      )}

      {viewMode === 'week' ? (
        <div className={styles.weekGridWrapper}>
          <WeekGrid
            weekDays={weekDays}
            jobs={jobs}
            setJobs={setJobs}
            onJobClick={(job) => setSelectedJob(job)}
            onDayClick={handleDayColumnClick}
          />
        </div>
      ) : displayJobs.length === 0 ? (
        <div className={states.emptyState}>
          <p>
            {statusFilter === 'active'
              ? t.jobsEmptyActive
              : statusFilter === 'COMPLETED'
                ? t.jobsEmptyCompleted
                : t.jobsEmptyAll}
          </p>
        </div>
      ) : (
        <>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                {(['title', 'status', 'driver', 'schedule'] as const).map((field) => {
                  const labels: Record<typeof field, string> = { title: t.colTitle, status: t.colStatus, driver: t.colDriver, schedule: t.colScheduled };
                  const active = sortBy === field;
                  return (
                    <th
                      key={field}
                      className={`${styles.th} ${styles.thSortable}`}
                      onClick={() => handleSort(field)}
                    >
                      {labels[field]}
                      <span className={`${styles.sortIndicator} ${active ? styles.sortIndicatorActive : ''}`}>
                        {active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅'}
                      </span>
                    </th>
                  );
                })}
                <th className={styles.th}>{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {displayJobs.map((job) => (
                <tr key={job.id} className={styles.tr} onClick={() => setSelectedJob(job)} style={{ cursor: 'pointer' }}>
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
                        <span className={styles.driverNotesLabel}>{t.detailDriverNotes}:</span> {job.driverNotes}
                      </div>
                    )}
                    {job.completionReport && (
                      <div className={styles.completionReport}>
                        <div className={styles.completionReportHeader}>
                          <span className={styles.completionReportTitle}>{t.detailCompletionSection}</span>
                          {job.completionReport.approvedAt ? (
                            <span className={styles.approvedBadge}>
                              {t.crApprovedAt} {fmtDateTime(job.completionReport.approvedAt)}
                            </span>
                          ) : (
                            <span className={styles.pendingBadge}>{t.crPending}</span>
                          )}
                        </div>
                        <div className={styles.completionReportRow}>
                          <strong>{t.crWork}:</strong> {job.completionReport.workDescription}
                        </div>
                        <div className={styles.completionReportRow}>
                          <strong>{t.crTime}:</strong>{' '}
                          {(() => {
                            const s = job.completionReport.actualStart;
                            const e = job.completionReport.actualEnd;
                            const sDate = new Date(s).toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' });
                            const eDate = new Date(e).toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' });
                            return sDate === eDate
                              ? `${fmtDateTime(s)} – ${fmtTime(e)}`
                              : `${fmtDateTime(s)} – ${fmtDateTime(e)}`;
                          })()}
                        </div>
                        <div className={styles.completionReportRow}>
                          <strong>{t.crHours}:</strong> {job.completionReport.totalHours.toFixed(2)} h
                        </div>
                        <div className={styles.completionReportRow}>
                          <strong>{t.crCustomer}:</strong> {job.completionReport.customerName}
                        </div>
                        {!job.completionReport.customerSignature && (
                          <div className={styles.completionReportRow}>
                            <strong>{t.crNoSignature}:</strong>{' '}
                            {job.completionReport.noSignatureReason ?? '—'}
                          </div>
                        )}
                        {!job.completionReport.approvedAt &&
                          (user?.role === 'Admin' || user?.role === 'Dispatcher') && (
                            <button
                              className={`${buttons.btn} ${buttons.btnSuccess} ${buttons.btnSmall}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleApproveReport(job.id);
                              }}
                              disabled={approvingReports.has(job.id)}
                            >
                              {approvingReports.has(job.id) ? t.crApproving : t.crApproveButton}
                            </button>
                          )}
                      </div>
                    )}
                  </td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${styles[`status${job.status.replace('_', '')}`]}`}>
                      {statusLabel(job.status)}
                    </span>
                  </td>
                  <td className={styles.td}>
                    {job.assignedDriver
                      ? driverLabel(job.assignedDriver)
                      : job.team
                        ? job.team.name
                        : <span className={styles.unassigned}>{t.unassigned}</span>}
                  </td>
                  <td className={styles.td}>{formatSchedulingInfo(job.scheduledStart, job.scheduledEnd, job.schedulingNote)}</td>
                  <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.actionGroup}>
                      {(job.status === 'DRAFT' || job.status === 'ASSIGNED') && (
                        <div className={styles.assignContainer}>
                          <button
                            className={`${buttons.btn} ${buttons.btnNeutral} ${buttons.btnSmall}`}
                            onClick={() => handleOpenAssign(job.id)}
                            disabled={assigningJobs.has(job.id)}
                          >
                            {assigningJobs.has(job.id) ? t.jobsAssigning : t.jobsAssignDriver}
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
                                {loadingDrivers ? t.loading : t.jobsAssignDriver}
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
                          className={`${buttons.btn} ${buttons.btnPrimaryTint} ${buttons.btnSmall}`}
                          onClick={() => void handleStatusUpdate(job.id, next)}
                          disabled={updatingStatus.has(job.id)}
                        >
                          {updatingStatus.has(job.id)
                            ? t.jobsUpdating
                            : `→ ${statusLabel(next)}`}
                        </button>
                      ))}
                      <button
                        className={`${buttons.btn} ${buttons.btnNeutral} ${buttons.btnSmall}`}
                        onClick={() => handleEditOpen(job)}
                      >
                        {t.edit}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              {t.paginationPrev}
            </button>
            <span className={styles.pageInfo}>
              {t.paginationPage} {page} {t.paginationOf} {pagination.totalPages}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
            >
              {t.paginationNext}
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
          onApproved={() => void fetchJobs(statusFilter, page, viewMode, weekStart, sortBy, sortDir)}
        />
      )}

      <JobCreateModal
        isOpen={isCreateModalOpen}
        initialDate={createModalInitialDate ?? undefined}
        onClose={() => { setIsCreateModalOpen(false); setCreateModalInitialDate(null); }}
        onSuccess={() => void fetchJobs(statusFilter, 1, viewMode, weekStart, sortBy, sortDir)}
      />
    </div>
  );
};

export default JobsPage;
