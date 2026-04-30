import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { parseISO, isValid, format } from 'date-fns';
import { Job } from '../../types';
import styles from './JobCard.module.css';

interface SortableJobCardProps {
  job: Job;
}

function formatTime(scheduledStart: string | null | undefined): string | null {
  if (!scheduledStart) return null;
  const d = parseISO(scheduledStart);
  return isValid(d) ? format(d, 'HH:mm') : null;
}

const SortableJobCard: React.FC<SortableJobCardProps> = ({ job }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: job.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const time = formatTime(job.scheduledStart);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={[
        styles.card,
        isDragging ? styles.dragging : '',
        isOver && !isDragging ? styles.dropTarget : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {time && <span className={styles.time}>{time}</span>}
      <span className={styles.title}>{job.title}</span>
      <span className={`${styles.badge} ${styles[`status${job.status}`]}`}>
        {job.status}
      </span>
    </div>
  );
};

export default SortableJobCard;
