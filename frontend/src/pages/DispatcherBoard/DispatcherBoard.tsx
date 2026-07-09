import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isSameDay,
  format,
  parseISO,
  isValid,
  set as setTime,
} from 'date-fns';
import { arrayMove } from '@dnd-kit/sortable';
import apiService from '../../services/api';
import JobPool from './components/JobPool/JobPool';
import DriverColumn from './components/DriverColumn/DriverColumn';
import TeamColumn from './components/TeamColumn/TeamColumn';
import TeamManagementModal from './components/TeamManagementModal/TeamManagementModal';
import JobCard from './components/JobCard/JobCard';
import { JobQuickLook } from './components/JobQuickLook/JobQuickLook';
import { JobEditModal, JobUpdatePayload } from '../../components/JobEditModal';
import { useTeams } from './hooks/useTeams';
import styles from './DispatcherBoard.module.css';
import { Job, Driver } from './types';
import { TopBar } from '../../components/TopBar/TopBar';
import { useLanguage } from '../../i18n/LanguageContext';
import buttons from '../../styles/buttons.module.css';

interface DroppableDayColumnProps {
  day: Date;
  dayLabel: string;
  jobs: Job[];
  onCardClick: (job: Job) => void;
}

const DroppableDayColumn: React.FC<DroppableDayColumnProps> = ({ day, dayLabel, jobs, onCardClick }) => {
  const id = format(day, 'yyyy-MM-dd');
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${styles.dayColumn} ${isOver ? styles.dayColumnOver : ''}`}>
      <div className={styles.dayHeader}>{dayLabel}</div>
      <div className={styles.dayJobs}>
        {jobs.length === 0 ? (
          <p className={styles.emptyDay}>—</p>
        ) : (
          jobs.map((job) => (
            <JobCard key={job.id} job={job} draggable onCardClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  );
};

interface DroppableUnscheduledProps {
  jobs: Job[];
  onCardClick: (job: Job) => void;
}

const DroppableUnscheduled: React.FC<DroppableUnscheduledProps> = ({ jobs, onCardClick }) => {
  const { t } = useLanguage();
  const { isOver, setNodeRef } = useDroppable({ id: 'unscheduled' });
  return (
    <section ref={setNodeRef} className={`${styles.unscheduledSection} ${isOver ? styles.unscheduledOver : ''}`}>
      <h2 className={styles.sectionHeading}>
        {t.boardUnscheduled} <span className={styles.count}>{jobs.length}</span>
      </h2>
      <div className={styles.unscheduledGrid}>
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} draggable onCardClick={onCardClick} />
        ))}
      </div>
    </section>
  );
};

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function parseJobDate(scheduledStart: string | null | undefined): Date | null {
  if (!scheduledStart) return null;
  const d = parseISO(scheduledStart);
  return isValid(d) ? d : null;
}

function sortByTime(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const ta = parseJobDate(a.scheduledStart);
    const tb = parseJobDate(b.scheduledStart);
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return ta.getTime() - tb.getTime();
  });
}

function sortByOrder(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const sa = a.sortOrder ?? 0;
    const sb = b.sortOrder ?? 0;
    if (sa !== sb) return sa - sb;
    const ta = parseJobDate(a.scheduledStart);
    const tb = parseJobDate(b.scheduledStart);
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return ta.getTime() - tb.getTime();
  });
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function shiftDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DispatcherBoard: React.FC = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<'assign' | 'schedule'>('assign');
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [datePickerValue, setDatePickerValue] = useState('');
  const [showTeamModal, setShowTeamModal] = useState(false);

  const { teams, createTeam, deleteTeam, error: teamsError } = useTeams(selectedDate);

  const driversInTeams = new Set(
    teams.flatMap((t) => t.members.map((m) => m.userId)),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const fetchAll = useCallback(async (_date: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const [draftRes, assignedRes, inProgressRes, driversRes] = await Promise.all([
        apiService.axios.get<{ data: { jobs: Job[] } }>('/api/jobs?status=DRAFT&pageSize=100'),
        apiService.axios.get<{ data: { jobs: Job[] } }>('/api/jobs?status=ASSIGNED&pageSize=200'),
        apiService.axios.get<{ data: { jobs: Job[] } }>('/api/jobs?status=IN_PROGRESS&pageSize=200'),
        apiService.axios.get<{ data: Driver[] }>('/api/users?role=Driver'),
      ]);
      setJobs([...draftRes.data.data.jobs, ...assignedRes.data.data.jobs, ...inProgressRes.data.data.jobs]);
      setDrivers(driversRes.data.data);
    } catch (err) {
      console.error('Failed to load board data:', err);
      setError('Failed to load board data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll(selectedDate);
  }, [fetchAll, selectedDate]);

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveJob(jobs.find((j) => j.id === event.active.id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;
    setActiveJob(null);
    if (!over || jobs.length === 0) return;

    const jobId = active.id as string;
    const overId = over.id as string;

    if (view === 'assign') {
      const activeJobData = jobs.find((j) => j.id === jobId);
      if (!activeJobData) return;

      const overJobData = jobs.find((j) => j.id === overId);

      const isWithinColumn =
        overJobData !== undefined &&
        overJobData.assignedDriverId !== null &&
        overJobData.assignedDriverId === activeJobData.assignedDriverId;

      if (isWithinColumn) {
        // Reorder within driver column — use the same date filter as the column display
        const colJobs = sortByOrder(jobs.filter((j) => {
          if (j.assignedDriverId !== activeJobData.assignedDriverId) return false;
          const d = parseJobDate(j.scheduledStart);
          return d ? isSameDay(d, parseISO(selectedDate)) : false;
        }));
        const oldIndex = colJobs.findIndex((j) => j.id === jobId);
        const newIndex = colJobs.findIndex((j) => j.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = arrayMove(colJobs, oldIndex, newIndex);
        // Re-index all items with even spacing so the order is always unambiguous
        const updates = reordered
          .map((j, idx) => ({ id: j.id, sortOrder: (idx + 1) * 1000 }))
          .filter(({ id, sortOrder }) => jobs.find((j) => j.id === id)?.sortOrder !== sortOrder);

        const snapshot = jobs;
        setJobs((prev) => prev.map((j) => {
          const u = updates.find((x) => x.id === j.id);
          return u ? { ...j, sortOrder: u.sortOrder } : j;
        }));

        try {
          await Promise.all(updates.map((u) => apiService.axios.patch(`/api/jobs/${u.id}`, { sortOrder: u.sortOrder })));
        } catch (err) {
          console.error('Failed to update sort order:', err);
          setJobs(snapshot);
        }
      } else {
        // Cross-column: pool, team column, or driver column
        const targetTeam = teams.find((t) => t.id === overId);

        let newAssignedDriverId: string | null;
        let newTeamId: string | null;

        if (overId === 'pool') {
          newAssignedDriverId = null;
          newTeamId = null;
        } else if (targetTeam) {
          newAssignedDriverId = null;
          newTeamId = targetTeam.id;
        } else {
          newAssignedDriverId = overJobData ? overJobData.assignedDriverId : overId;
          newTeamId = null;
        }

        // No-op if nothing changes
        if (
          newAssignedDriverId === (activeJobData.assignedDriverId ?? null) &&
          newTeamId === (activeJobData.teamId ?? null)
        ) return;

        const newStatus =
          newAssignedDriverId === null && newTeamId === null
            ? ('DRAFT' as const)
            : ('ASSIGNED' as const);

        const snapshot: Job[] = jobs;
        setJobs((prev) =>
          prev.map((job) =>
            job.id !== jobId
              ? job
              : { ...job, assignedDriverId: newAssignedDriverId, teamId: newTeamId, status: newStatus },
          ),
        );

        try {
          await apiService.axios.patch(`/api/jobs/${jobId}`, {
            assignedDriverId: newAssignedDriverId,
            teamId: newTeamId,
            status: newStatus,
          });
        } catch (err) {
          console.error('Failed to update job assignment:', err);
          setJobs(snapshot);
        }
      }
    } else {
      // Schedule view: update scheduledStart
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;

      let newScheduledStart: string | null;

      if (overId === 'unscheduled') {
        newScheduledStart = null;
      } else {
        const targetDay = parseISO(overId);
        if (!isValid(targetDay)) return;

        if (job.scheduledStart) {
          const existing = parseISO(job.scheduledStart);
          if (isValid(existing)) {
            newScheduledStart = setTime(targetDay, {
              hours: existing.getHours(),
              minutes: existing.getMinutes(),
              seconds: 0,
              milliseconds: 0,
            }).toISOString();
          } else {
            newScheduledStart = setTime(targetDay, { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString();
          }
        } else {
          newScheduledStart = setTime(targetDay, { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 }).toISOString();
        }
      }

      if (newScheduledStart === (job.scheduledStart ?? null)) return;

      const snapshot: Job[] = jobs;
      setJobs((prev) =>
        prev.map((j) => (j.id !== jobId ? j : { ...j, scheduledStart: newScheduledStart })),
      );

      try {
        await apiService.axios.patch(`/api/jobs/${jobId}`, { scheduledStart: newScheduledStart });
      } catch (err) {
        console.error('Failed to update job schedule:', err);
        setJobs(snapshot);
      }
    }
  };

  const handleSave = async (updates: JobUpdatePayload): Promise<void> => {
    if (!editingJob) return;
    const res = await apiService.axios.patch<{ data: Job }>(`/api/jobs/${editingJob.id}`, updates);
    setJobs((prev) => prev.map((j) => (j.id === editingJob.id ? { ...j, ...res.data.data } : j)));
  };

  const handleAssignDriver = async (jobId: string, driverId: string): Promise<void> => {
    const res = await apiService.axios.patch<{ data: Job }>(`/api/jobs/${jobId}`, {
      assignedDriverId: driverId,
    });
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...res.data.data } : j)));
    setSelectedJob((prev) => (prev && prev.id === jobId ? { ...prev, ...res.data.data } : prev));
  };

  const handleStatusChange = async (jobId: string, newStatus: Job['status']): Promise<void> => {
    const res = await apiService.axios.patch<{ data: Job }>(`/api/jobs/${jobId}`, {
      status: newStatus,
    });
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...res.data.data } : j)));
    setSelectedJob((prev) => (prev && prev.id === jobId ? { ...prev, ...res.data.data } : prev));
  };

  const handleDatePicker = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setDatePickerValue(val);
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
        setDatePickerValue('');
      }
    }
  };

  const weekDays = getWeekDays(weekStart);
  const weekLabel = `${format(weekDays[0], t.dateDayMonth)} – ${format(weekDays[6], t.dateDayMonthYear)}`;
  const dateSep = t.dateDayMonth.includes('.') ? '.' : '/';
  const formatAssignDateLocale = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}${dateSep}${month}${dateSep}${year}`;
  };

  if (loading) {
    return (
      <div className={styles.board}>
        <p className={styles.statusMessage}>{t.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.board}>
        <p className={styles.statusMessage}>{error}</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        <TopBar title={t.navDispatcherBoard} />

        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'assign' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('assign')}
          >
            {t.boardAssignTab}
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'schedule' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('schedule')}
          >
            {t.boardScheduleTab}
          </button>
        </div>

        {view === 'assign' && (
          <>
            <div className={styles.assignDateRow}>
              <button
                className={styles.navBtn}
                onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                aria-label={t.boardPrevDay}
              >←</button>
              <input
                type="date"
                value={selectedDate}
                min={dateOffset(-365)}
                max={dateOffset(365)}
                onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
                className={styles.datePicker}
                aria-label={t.schedDate}
              />
              <button
                className={styles.navBtn}
                onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                aria-label={t.boardNextDay}
              >→</button>
              <span className={styles.weekLabel}>{formatAssignDateLocale(selectedDate)}</span>
              <button
                className={`${buttons.btn} ${buttons.btnPrimary} ${buttons.btnSmall} ${styles.createTeamBtn}`}
                onClick={() => setShowTeamModal(true)}
              >
                {t.boardCreateTeam}
              </button>
            </div>
            {teamsError && (
              <p className={styles.statusMessage} style={{ color: '#b91c1c' }}>{teamsError}</p>
            )}
            <JobPool
              jobs={jobs.filter((j) => {
                if (j.assignedDriverId || j.teamId) return false;
                const d = parseJobDate(j.scheduledStart);
                return d ? isSameDay(d, parseISO(selectedDate)) : false;
              })}
              onCardClick={setSelectedJob}
            />
            <section className={styles.driversSection}>
              <h2 className={styles.driversHeading}>{t.boardDriversTeams}</h2>
              <div className={styles.driverColumns}>
                {drivers
                  .filter((driver) => !driversInTeams.has(driver.id))
                  .map((driver) => (
                    <DriverColumn
                      key={driver.id}
                      driver={driver}
                      jobs={sortByOrder(jobs.filter((j) => {
                        if (j.assignedDriverId !== driver.id) return false;
                        const d = parseJobDate(j.scheduledStart);
                        return d ? isSameDay(d, parseISO(selectedDate)) : false;
                      }))}
                      onCardClick={setSelectedJob}
                    />
                  ))}
                {teams.map((team) => {
                  const memberIds = new Set(team.members.map((m) => m.userId));
                  return (
                    <TeamColumn
                      key={team.id}
                      team={team}
                      jobs={sortByOrder(jobs.filter((j) => {
                        if (j.teamId === team.id) return true;
                        if (j.assignedDriverId && memberIds.has(j.assignedDriverId)) {
                          const d = parseJobDate(j.scheduledStart);
                          return d ? isSameDay(d, parseISO(selectedDate)) : false;
                        }
                        return false;
                      }))}
                      onDelete={deleteTeam}
                      onCardClick={setSelectedJob}
                    />
                  );
                })}
              </div>
            </section>
          </>
        )}

        {view === 'schedule' && (
          <>
            <div className={styles.nav}>
              <button
                className={styles.navBtn}
                onClick={() => setWeekStart((w) => subWeeks(w, 1))}
                aria-label={t.boardPrevWeek}
              >
                ←
              </button>
              <span className={styles.weekLabel}>{weekLabel}</span>
              <button
                className={styles.navBtn}
                onClick={() => setWeekStart((w) => addWeeks(w, 1))}
                aria-label={t.boardNextWeek}
              >
                →
              </button>
              <input
                type="date"
                className={styles.datePicker}
                value={datePickerValue}
                onChange={handleDatePicker}
                aria-label={t.boardJumpToWeek}
              />
            </div>

            <DroppableUnscheduled
              jobs={jobs.filter((j) => !j.scheduledStart)}
              onCardClick={setSelectedJob}
            />

            <div className={styles.weekGrid}>
              {weekDays.map((day, i) => {
                const dayJobs = sortByTime(
                  jobs.filter((j) => {
                    const d = parseJobDate(j.scheduledStart);
                    return d ? isSameDay(d, day) : false;
                  }),
                );
                return (
                  <DroppableDayColumn
                    key={day.toISOString()}
                    day={day}
                    dayLabel={`${t.weekdays[i]} ${format(day, t.dateDayMonth)}`}
                    jobs={dayJobs}
                    onCardClick={setSelectedJob}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      <DragOverlay>
        {activeJob ? <JobCard job={activeJob} overlay /> : null}
      </DragOverlay>

      {selectedJob && (
        <JobQuickLook
          job={selectedJob}
          drivers={drivers}
          isOpen={true}
          onClose={() => setSelectedJob(null)}
          onEdit={() => { setEditingJob(selectedJob); setSelectedJob(null); }}
          onAssignDriver={handleAssignDriver}
          onStatusChange={handleStatusChange}
        />
      )}

      {editingJob && (
        <JobEditModal
          job={editingJob}
          isOpen={true}
          onClose={() => setEditingJob(null)}
          onSave={handleSave}
        />
      )}

      <TeamManagementModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onCreate={createTeam}
        drivers={drivers}
        driversInTeams={driversInTeams}
      />
    </DndContext>
  );
};

export default DispatcherBoard;
