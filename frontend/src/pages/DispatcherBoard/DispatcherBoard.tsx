import React, { useState } from 'react';
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
import { mockJobs, mockDrivers, Job } from './mockData';
import JobPool from './components/JobPool/JobPool';
import DriverColumn from './components/DriverColumn/DriverColumn';
import JobCard from './components/JobCard/JobCard';
import styles from './DispatcherBoard.module.css';

const DispatcherBoard: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveJob(jobs.find((j) => j.id === event.active.id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);
    if (!over) return;

    const jobId = active.id as string;
    const overId = over.id as string;

    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        if (overId === 'pool') {
          return { ...job, assignedDriverId: null, status: 'DRAFT' as const };
        }
        return { ...job, assignedDriverId: overId, status: 'ASSIGNED' as const };
      })
    );
  };

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

        <JobPool jobs={jobs.filter((j) => j.assignedDriverId === null)} />

        <section className={styles.driversSection}>
          <h2 className={styles.driversHeading}>Drivers</h2>
          <div className={styles.driverColumns}>
            {mockDrivers.map((driver) => (
              <DriverColumn
                key={driver.id}
                driver={driver}
                jobs={jobs.filter((j) => j.assignedDriverId === driver.id)}
              />
            ))}
          </div>
        </section>
      </div>

      <DragOverlay>
        {activeJob ? <JobCard job={activeJob} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DispatcherBoard;
