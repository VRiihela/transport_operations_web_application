import React from 'react';
import { Job } from '../../mockData';
import JobCard from '../JobCard/JobCard';
import styles from './JobPool.module.css';

interface JobPoolProps {
  jobs: Job[];
}

const JobPool: React.FC<JobPoolProps> = ({ jobs }) => {
  const unassigned = jobs.filter((j) => j.status === 'DRAFT');

  return (
    <section className={styles.pool}>
      <h2 className={styles.heading}>
        Unassigned jobs <span className={styles.count}>{unassigned.length}</span>
      </h2>
      {unassigned.length === 0 ? (
        <p className={styles.empty}>No unassigned jobs.</p>
      ) : (
        <div className={styles.grid}>
          {unassigned.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
};

export default JobPool;
