import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './JobsPage.module.css';

const JobsPage: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = (): void => {
    void logout();
  };

  const handleCreateJob = (): void => {
    // Placeholder for future implementation
    console.log('Create job clicked');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Jobs</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.actions}>
          <button onClick={handleCreateJob} className={styles.createButton}>
            Create Job
          </button>
        </div>

        <div className={styles.jobList}>
          <p className={styles.placeholder}>
            Job listings will appear here once the backend integration is complete.
          </p>
        </div>
      </main>
    </div>
  );
};

export default JobsPage;
