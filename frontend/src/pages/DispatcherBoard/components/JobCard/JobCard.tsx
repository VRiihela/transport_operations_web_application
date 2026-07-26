import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Job } from '../../types';
import { formatSchedule } from '../../formatSchedule';
import { useLanguage } from '../../../../i18n/LanguageContext';
import styles from './JobCard.module.css';

interface JobCardProps {
  job: Job;
  draggable?: boolean;
  overlay?: boolean;
  onCardClick?: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, draggable = false, overlay = false, onCardClick }) => {
  const { statusLabel } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    disabled: !draggable,
  });

  const schedule = formatSchedule(job);
  const address = [job.street, job.houseNumber].filter(Boolean).join(' ');
  const addressCity = [job.postalCode, job.city].filter(Boolean).join(' ');
  const metaLine = [address, addressCity].filter(Boolean).join(', ')
    || (job.assignedDriver ? (job.assignedDriver.name ?? job.assignedDriver.email) : null);

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
      onClick={onCardClick ? () => onCardClick(job) : undefined}
      className={[
        styles.card,
        isDragging && draggable ? styles.dragging : '',
        overlay ? styles.overlay : '',
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

export default JobCard;
