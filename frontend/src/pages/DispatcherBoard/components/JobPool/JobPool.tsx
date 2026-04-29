import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Job } from '../../types';
import JobCard from '../JobCard/JobCard';
import styles from './JobPool.module.css';

interface JobPoolProps {
  jobs: Job[];
  onCardClick?: (job: Job) => void;
}

const JobPool: React.FC<JobPoolProps> = ({ jobs, onCardClick }) => {
  const { isOver, setNodeRef } = useDroppable({ id: 'pool' });

  return (
    <section ref={setNodeRef} className={`${styles.pool} ${isOver ? styles.over : ''}`}>
      <h2 className={styles.heading}>
        Unassigned jobs <span className={styles.count}>{jobs.length}</span>
      </h2>
      {jobs.length === 0 ? (
        <p className={styles.empty}>No unassigned jobs.</p>
      ) : (
        <div className={styles.grid}>
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} draggable onCardClick={onCardClick} />
          ))}
        </div>
      )}
    </section>
  );
};

export default JobPool;
