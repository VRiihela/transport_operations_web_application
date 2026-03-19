import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/App.module.css';

export function MyJobsPage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>My Jobs</h1>
        <div className={styles.headerRight}>
          <span className={styles.userInfo}>{user?.email}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>Sign out</button>
        </div>
      </header>
      <main className={styles.main}>
        <p className={styles.placeholder}>Your assigned jobs will appear here.</p>
      </main>
    </div>
  );
}
