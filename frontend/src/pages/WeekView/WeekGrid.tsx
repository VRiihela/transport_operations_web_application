import React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../api/axios';
import type { Job } from '../../types/jobApi';
import { WeekDayColumn } from './WeekDayColumn';
import { WeekJobCard } from './WeekJobCard';
import { useWeekDragDrop } from './useWeekDragDrop';
import styles from './weekGrid.module.css';

function getHelsinkiDateISO(date: Date): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value ?? '';
  const m = parts.find((p) => p.type === 'month')?.value ?? '';
  const d = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${y}-${m}-${d}`;
}

interface WeekGridProps {
  weekDays: Date[];
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  onJobClick: (job: Job) => void;
}

export const WeekGrid: React.FC<WeekGridProps> = ({ weekDays, jobs, setJobs, onJobClick }) => {
  const { user } = useAuth();
  const userRole = user?.role ?? 'Driver';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const { activeJob, dragError, clearError, handleDragStart, handleDragOver, handleDragEnd } =
    useWeekDragDrop({ jobs, setJobs, axiosInstance });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(e) => { void handleDragEnd(e); }}
    >
      <div className={styles.weekGrid}>
        {weekDays.map((day, idx) => {
          const dayISO = format(day, 'yyyy-MM-dd');
          const dayJobs = jobs
            .filter((job) => {
              if (!job.scheduledStart) return false;
              return getHelsinkiDateISO(new Date(job.scheduledStart)) === dayISO;
            })
            .sort((a, b) => {
              const ta = a.scheduledStart ? new Date(a.scheduledStart).getTime() : Infinity;
              const tb = b.scheduledStart ? new Date(b.scheduledStart).getTime() : Infinity;
              return ta - tb;
            });

          return (
            <WeekDayColumn
              key={dayISO}
              day={day}
              dayIndex={idx}
              dayJobs={dayJobs}
              onJobClick={onJobClick}
              userRole={userRole}
              dragError={dragError}
              clearError={clearError}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeJob ? (
          <WeekJobCard
            job={activeJob}
            isDraggable={false}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
