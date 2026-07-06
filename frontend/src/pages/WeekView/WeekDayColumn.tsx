import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import type { Job } from '../../types/jobApi';
import type { WeekDragError } from './WeekView.types';
import { canDrag } from './WeekView.types';
import { WeekJobCard } from './WeekJobCard';
import { useLanguage } from '../../i18n/LanguageContext';
import type { UserRole } from '../../types/auth.types';
import styles from './weekGrid.module.css';

interface WeekDayColumnProps {
  day: Date;
  dayIndex: number;
  dayJobs: Job[];
  onJobClick: (job: Job) => void;
  userRole: UserRole;
  dragError: WeekDragError | null;
  clearError: (jobId: string) => void;
}

export const WeekDayColumn: React.FC<WeekDayColumnProps> = ({
  day,
  dayIndex,
  dayJobs,
  onJobClick,
  userRole,
  dragError,
  clearError,
}) => {
  const { t } = useLanguage();
  const columnDateISO = format(day, 'yyyy-MM-dd');
  const { isOver, setNodeRef } = useDroppable({ id: columnDateISO });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.weekDayCol} ${isOver ? styles.dragOver : ''}`}
    >
      <div className={styles.weekDayHeader}>
        <span className={styles.weekDayName}>{t.weekdays[dayIndex]}</span>
        <span className={styles.weekDayDate}>{format(day, t.dateDayMonth)}</span>
      </div>
      <div className={styles.weekDayBody}>
        {dayJobs.map((job) => (
          <WeekJobCard
            key={job.id}
            job={job}
            isDraggable={canDrag(userRole, job.status)}
            errorMessage={dragError?.jobId === job.id ? dragError.message : undefined}
            onErrorClear={() => clearError(job.id)}
            onClick={() => onJobClick(job)}
          />
        ))}
      </div>
    </div>
  );
};
