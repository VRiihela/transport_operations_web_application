import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { parseISO, isValid, format } from 'date-fns';
import { Job } from '../../types';
import styles from './JobCard.module.css';

interface JobCardProps {
  job: Job;
  draggable?: boolean;
  overlay?: boolean;
  onCardClick?: (job: Job) => void;
}

function formatTime(scheduledStart: string | null | undefined): string | null {
  if (!scheduledStart) return null;
  const d = parseISO(scheduledStart);
  return isValid(d) ? format(d, 'HH:mm') : null;
}

const JobCard: React.FC<JobCardProps> = ({ job, draggable = false, overlay = false, onCardClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    disabled: !draggable,
  });

  const time = formatTime(job.scheduledStart);

  const style: React.CSSProperties = draggable
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        cursor: overlay ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
      }
    : {};

  return (
    <div
      ref={draggable && !overlay ? setNodeRef : undefined}
      style={style}
      {...(draggable && !overlay ? { ...listeners, ...attributes } : {})}
      onClick={onCardClick && !draggable ? () => onCardClick(job) : undefined}
      className={[
        styles.card,
        isDragging && draggable ? styles.dragging : '',
        overlay ? styles.overlay : '',
        onCardClick && !draggable ? styles.clickable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={onCardClick && !draggable ? 'button' : undefined}
      tabIndex={onCardClick && !draggable ? 0 : undefined}
      onKeyDown={
        onCardClick && !draggable
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') onCardClick(job); }
          : undefined
      }
    >
      {time && <span className={styles.time}>{time}</span>}
      <span className={styles.title}>{job.title}</span>
      <span className={`${styles.badge} ${styles[`status${job.status}`]}`}>
        {job.status}
      </span>
    </div>
  );
};

export default JobCard;
