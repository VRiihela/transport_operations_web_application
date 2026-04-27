import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Driver, Job } from '../../mockData';
import JobCard from '../JobCard/JobCard';
import styles from './DriverColumn.module.css';

interface DriverColumnProps {
  driver: Driver;
  jobs: Job[];
}

const DriverColumn: React.FC<DriverColumnProps> = ({ driver, jobs }) => {
  const { isOver, setNodeRef } = useDroppable({ id: driver.id });

  return (
    <div ref={setNodeRef} className={`${styles.column} ${isOver ? styles.over : ''}`}>
      <h3 className={styles.name}>{driver.name}</h3>
      <div className={styles.jobCount}>{jobs.length} job{jobs.length !== 1 ? 's' : ''}</div>
      <div className={styles.jobs}>
        {jobs.length === 0 ? (
          <p className={styles.empty}>No assigned jobs.</p>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
};

export default DriverColumn;
