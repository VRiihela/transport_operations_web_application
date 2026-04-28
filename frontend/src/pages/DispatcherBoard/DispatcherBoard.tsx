import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import apiService from '../../services/api';
import JobPool from './components/JobPool/JobPool';
import DriverColumn from './components/DriverColumn/DriverColumn';
import JobCard from './components/JobCard/JobCard';
import { JobDetailModal } from '../../components/JobDetailModal';
import { JobEditModal, JobUpdatePayload } from '../../components/JobEditModal';
import styles from './DispatcherBoard.module.css';
import { Job, Driver } from './types';

const DispatcherBoard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        const [draftRes, assignedRes, driversRes] = await Promise.all([
          apiService.axios.get<{ data: { jobs: Job[] } }>('/api/jobs?status=DRAFT&limit=100'),
          apiService.axios.get<{ data: { jobs: Job[] } }>('/api/jobs?status=ASSIGNED&limit=100'),
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
    };
    void fetchData();
  }, []);

  const handleSave = async (updates: JobUpdatePayload): Promise<void> => {
    if (!editingJob) return;
    const res = await apiService.axios.patch<{ data: Job }>(`/api/jobs/${editingJob.id}`, updates);
    setJobs((prev) => prev.map((j) => (j.id === editingJob.id ? { ...j, ...res.data.data } : j)));
  };

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveJob(jobs.find((j) => j.id === event.active.id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;
    setActiveJob(null);
    if (!over) return;

    // Only apply optimistic update and PATCH if jobs is loaded and non-empty
    if (jobs.length === 0) return;

    const jobId = active.id as string;
    const overId = over.id as string;

    const newAssignedDriverId = overId === 'pool' ? null : overId;
    const newStatus = overId === 'pool' ? ('DRAFT' as const) : ('ASSIGNED' as const);

    // Capture snapshot before optimistic update
    const snapshot: Job[] | null = jobs;

    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        return { ...job, assignedDriverId: newAssignedDriverId, status: newStatus };
      })
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
  };

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
        </header>

        <JobPool
          jobs={jobs.filter((j) => j.assignedDriverId === null)}
          onCardClick={setSelectedJob}
        />

        <section className={styles.driversSection}>
          <h2 className={styles.driversHeading}>Drivers</h2>
          <div className={styles.driverColumns}>
            {drivers.map((driver) => (
              <DriverColumn
                key={driver.id}
                driver={driver}
                jobs={jobs.filter((j) => j.assignedDriverId === driver.id)}
                onCardClick={setSelectedJob}
              />
            ))}
          </div>
        </section>
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
