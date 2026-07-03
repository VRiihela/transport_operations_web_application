import React, { useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Job } from '../../types/jobApi';
import type { DraggableJobData } from './WeekView.types';
import styles from './weekJobCard.module.css';

interface WeekJobCardProps {
  job: Job;
  isDraggable: boolean;
  errorMessage?: string;
  onErrorClear?: () => void;
  isOverlay?: boolean;
  onClick?: () => void;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

function driverLabel(driver: { name: string | null; email: string }): string {
  return driver.name ?? driver.email;
}

export const WeekJobCard: React.FC<WeekJobCardProps> = ({
  job,
  isDraggable,
  errorMessage,
  onErrorClear,
  isOverlay = false,
  onClick,
}) => {
  const draggableData: DraggableJobData = { job };

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    data: draggableData,
    disabled: !isDraggable,
  });

  // Clear error when this card starts being dragged
  useEffect(() => {
    if (isDragging) onErrorClear?.();
  }, [isDragging, onErrorClear]);

  // Clear error on unmount via a stable ref so we don't recreate the effect
  const onErrorClearRef = useRef(onErrorClear);
  useEffect(() => { onErrorClearRef.current = onErrorClear; });
  useEffect(() => {
    return () => { onErrorClearRef.current?.(); };
  }, []);

  const style: React.CSSProperties =
    isDraggable && transform
      ? { transform: CSS.Translate.toString(transform) }
      : {};

  const cardClass = [
    styles.card,
    isDragging && !isOverlay ? styles.dragging : '',
    isOverlay ? styles.overlay : '',
    !isDraggable ? styles.readOnly : '',
  ]
    .filter(Boolean)
    .join(' ');

  const statusKey = `status${job.status.replace('_', '')}` as keyof typeof styles;

  return (
    <div
      ref={isDraggable ? setNodeRef : undefined}
      style={style}
      className={cardClass}
      onClick={onClick}
      {...(isDraggable ? listeners : {})}
      {...(isDraggable ? attributes : {})}
      aria-roledescription={isDraggable ? 'Draggable job card' : undefined}
    >
      <span className={`${styles.statusBadge} ${styles[statusKey] ?? ''}`}>
        {job.status.replace('_', ' ')}
      </span>

      <div className={styles.title}>{job.title}</div>

      {(job.scheduledStart ?? job.scheduledEnd) && (
        <div className={styles.time}>
          {job.scheduledStart && job.scheduledEnd
            ? `${formatTime(job.scheduledStart)} – ${formatTime(job.scheduledEnd)}`
            : job.scheduledStart
              ? formatTime(job.scheduledStart)
              : formatTime(job.scheduledEnd as string)}
        </div>
      )}

      {(job.assignedDriver ?? job.team) && (
        <div className={styles.driver}>
          {job.assignedDriver ? driverLabel(job.assignedDriver) : job.team?.name}
        </div>
      )}

      {errorMessage && (
        <span className={styles.error}>{errorMessage}</span>
      )}
    </div>
  );
};
