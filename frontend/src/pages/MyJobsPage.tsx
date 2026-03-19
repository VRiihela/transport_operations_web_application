import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './MyJobsPage.module.css';

const MyJobsPage: React.FC = () => {
  const { logout } = useAuth();

  const handleLogout = (): void => {
    void logout();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Jobs</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Logout
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.jobList}>
          <p className={styles.placeholder}>
            Your job assignments will appear here once the backend integration is complete.
          </p>
        </div>
      </main>
    </div>
  );
};

export default MyJobsPage;
