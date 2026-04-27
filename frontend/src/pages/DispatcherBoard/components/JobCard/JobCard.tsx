import React from 'react';
import { Job } from '../../mockData';
import styles from './JobCard.module.css';

interface JobCardProps {
  job: Job;
}

const JobCard: React.FC<JobCardProps> = ({ job }) => (
  <div className={styles.card}>
    <span className={styles.title}>{job.title}</span>
    <span className={`${styles.badge} ${job.status === 'DRAFT' ? styles.draft : styles.assigned}`}>
      {job.status}
    </span>
  </div>
);

export default JobCard;
