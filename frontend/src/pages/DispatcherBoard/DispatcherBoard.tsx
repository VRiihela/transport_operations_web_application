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
import apiService from '../../services/api';
import JobPool from './components/JobPool/JobPool';
import DriverColumn from './components/DriverColumn/DriverColumn';
import JobCard from './components/JobCard/JobCard';
import { JobDetailModal } from '../../components/JobDetailModal';
import { JobEditModal, JobUpdatePayload } from '../../components/JobEditModal';
import styles from './DispatcherBoard.module.css';
import { Job, Driver } from './types';

const FI_WEEKDAYS = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];

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
  const { isOver, setNodeRef } = useDroppable({ id: 'unscheduled' });
  return (
    <section ref={setNodeRef} className={`${styles.unscheduledSection} ${isOver ? styles.unscheduledOver : ''}`}>
      <h2 className={styles.sectionHeading}>
        Aikatauluttamattomat <span className={styles.count}>{jobs.length}</span>
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

function formatAssignDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const fetchAll = useCallback(async (date: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const { from, to } = getDayBounds(date);
      const [draftRes, assignedRes, driversRes] = await Promise.all([
        apiService.axios.get<{ data: { jobs: Job[] } }>('/api/jobs?status=DRAFT&limit=100'),
        apiService.axios.get<{ data: { jobs: Job[] } }>(
          `/api/jobs?status=ASSIGNED&scheduledFrom=${encodeURIComponent(from)}&scheduledTo=${encodeURIComponent(to)}&limit=100`,
        ),
        apiService.axios.get<{ data: Driver[] }>('/api/users?role=Driver'),
      ]);
      setJobs([...draftRes.data.data.jobs, ...assignedRes.data.data.jobs]);
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
      const newAssignedDriverId = overId === 'pool' ? null : overId;
      const newStatus = overId === 'pool' ? ('DRAFT' as const) : ('ASSIGNED' as const);

      const snapshot: Job[] = jobs;
      setJobs((prev) =>
        prev.map((job) =>
          job.id !== jobId ? job : { ...job, assignedDriverId: newAssignedDriverId, status: newStatus },
        ),
      );

      try {
        await apiService.axios.patch(`/api/jobs/${jobId}`, {
          assignedDriverId: newAssignedDriverId,
          status: newStatus,
        });
      } catch (err) {
        console.error('Failed to update job assignment:', err);
        if (snapshot !== null) {
          setJobs(snapshot);
        } else {
          console.warn('Rollback snapshot is null, skipping rollback');
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
  const weekLabel = `${format(weekDays[0], 'd.M.')} – ${format(weekDays[6], 'd.M.yyyy')}`;

  if (loading) {
    return (
      <div className={styles.board}>
        <p className={styles.statusMessage}>Loading board data…</p>
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
        <header className={styles.header}>
          <h1 className={styles.title}>Dispatcher Board</h1>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${view === 'assign' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('assign')}
            >
              Assign
            </button>
            <button
              className={`${styles.viewBtn} ${view === 'schedule' ? styles.viewBtnActive : ''}`}
              onClick={() => setView('schedule')}
            >
              Schedule
            </button>
          </div>
        </header>

        {view === 'assign' && (
          <>
            <div className={styles.assignDateRow}>
              <button
                className={styles.navBtn}
                onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                aria-label="Previous day"
              >←</button>
              <input
                type="date"
                value={selectedDate}
                min={dateOffset(-365)}
                max={dateOffset(365)}
                onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
                className={styles.datePicker}
                aria-label="Filter by date"
              />
              <button
                className={styles.navBtn}
                onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                aria-label="Next day"
              >→</button>
              <span className={styles.weekLabel}>{formatAssignDate(selectedDate)}</span>
            </div>
            <JobPool
              jobs={jobs.filter((j) => {
                if (j.assignedDriverId !== null) return false;
                const d = parseJobDate(j.scheduledStart);
                return !d || isSameDay(d, parseISO(selectedDate));
              })}
              onCardClick={setSelectedJob}
            />
            <section className={styles.driversSection}>
              <h2 className={styles.driversHeading}>Drivers</h2>
              <div className={styles.driverColumns}>
                {drivers.map((driver) => (
                  <DriverColumn
                    key={driver.id}
                    driver={driver}
                    jobs={sortByTime(jobs.filter((j) => j.assignedDriverId === driver.id))}
                    onCardClick={setSelectedJob}
                  />
                ))}
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
                aria-label="Edellinen viikko"
              >
                ←
              </button>
              <span className={styles.weekLabel}>{weekLabel}</span>
              <button
                className={styles.navBtn}
                onClick={() => setWeekStart((w) => addWeeks(w, 1))}
                aria-label="Seuraava viikko"
              >
                →
              </button>
              <input
                type="date"
                className={styles.datePicker}
                value={datePickerValue}
                onChange={handleDatePicker}
                aria-label="Siirry viikolle"
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
                    dayLabel={`${FI_WEEKDAYS[i]} ${format(day, 'd.M.')}`}
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
        <JobDetailModal
          job={selectedJob}
          isOpen={true}
          onClose={() => setSelectedJob(null)}
          onEdit={() => { setEditingJob(selectedJob); setSelectedJob(null); }}
        />
      )}

      {editingJob && (
        <JobEditModal
          job={editingJob}
          drivers={drivers.map((d) => ({ id: d.id, name: d.name, email: '', isActive: true }))}
          isOpen={true}
          onClose={() => setEditingJob(null)}
          onSave={handleSave}
        />
      )}
    </DndContext>
  );
};

export default DispatcherBoard;
