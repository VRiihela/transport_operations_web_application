import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Job } from '../../types';
import { formatSchedule } from '../../formatSchedule';
import { useLanguage } from '../../../../i18n/LanguageContext';
import styles from './JobCard.module.css';

interface SortableJobCardProps {
  job: Job;
  onCardClick?: (job: Job) => void;
}

const SortableJobCard: React.FC<SortableJobCardProps> = ({ job, onCardClick }) => {
  const { statusLabel } = useLanguage();
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

  const schedule = formatSchedule(job);
  const address = [job.street, job.houseNumber].filter(Boolean).join(' ');
  const addressCity = [job.postalCode, job.city].filter(Boolean).join(' ');
  const metaLine = [address, addressCity].filter(Boolean).join(', ')
    || (job.assignedDriver ? (job.assignedDriver.name ?? job.assignedDriver.email) : null);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onCardClick ? () => onCardClick(job) : undefined}
      className={[
        styles.card,
        isDragging ? styles.dragging : '',
        isOver && !isDragging ? styles.dropTarget : '',
        onCardClick ? styles.clickable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onKeyDown={
        onCardClick
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') onCardClick(job); }
          : undefined
      }
    >
      <div className={styles.headerRow}>
        <span className={styles.time}>
          {schedule.primary}
          <span className={styles.scheduleLabel}>{schedule.label}</span>
        </span>
        <span className={`${styles.badge} ${styles[`status${job.status}`]}`}>
          {statusLabel(job.status)}
        </span>
      </div>
      <div className={styles.title}>{job.title}</div>
      {metaLine && <div className={styles.meta}>{metaLine}</div>}
    </div>
  );
};

export default SortableJobCard;
