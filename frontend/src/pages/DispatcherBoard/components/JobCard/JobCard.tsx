import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Job } from '../../mockData';
import styles from './JobCard.module.css';

interface JobCardProps {
  job: Job;
  overlay?: boolean;
}

const JobCard: React.FC<JobCardProps> = ({ job, overlay = false }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });

  const style = overlay
    ? { cursor: 'grabbing' as const }
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        cursor: isDragging ? ('grabbing' as const) : ('grab' as const),
      };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : { ...listeners, ...attributes })}
      className={[
        styles.card,
        isDragging ? styles.dragging : '',
        overlay ? styles.overlay : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={styles.title}>{job.title}</span>
      <span className={`${styles.badge} ${job.status === 'DRAFT' ? styles.draft : styles.assigned}`}>
        {job.status}
      </span>
    </div>
  );
};

export default JobCard;
