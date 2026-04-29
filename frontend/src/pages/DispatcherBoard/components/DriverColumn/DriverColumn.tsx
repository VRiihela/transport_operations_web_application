import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Driver, Job } from '../../types';
import JobCard from '../JobCard/JobCard';
import styles from './DriverColumn.module.css';

interface DriverColumnProps {
  driver: Driver;
  jobs: Job[];
  onCardClick?: (job: Job) => void;
}

const DriverColumn: React.FC<DriverColumnProps> = ({ driver, jobs, onCardClick }) => {
  const { isOver, setNodeRef } = useDroppable({ id: driver.id });

  return (
    <div ref={setNodeRef} className={`${styles.column} ${isOver ? styles.over : ''}`}>
      <h3 className={styles.name}>{driver.name}</h3>
      <div className={styles.jobCount}>{jobs.length} job{jobs.length !== 1 ? 's' : ''}</div>
      <div className={styles.jobs}>
        {jobs.length === 0 ? (
          <p className={styles.empty}>No assigned jobs.</p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} draggable onCardClick={onCardClick} />)
        )}
      </div>
    </div>
  );
};

export default DriverColumn;
