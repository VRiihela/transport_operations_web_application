import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/App.module.css';

export function JobsPage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>Jobs Dashboard</h1>
        <div className={styles.headerRight}>
          <span className={styles.userInfo}>{user?.email} · {user?.role}</span>
          <button onClick={handleLogout} className={styles.logoutButton}>Sign out</button>
        </div>
      </header>
      <main className={styles.main}>
        <p className={styles.placeholder}>Jobs list coming soon.</p>
      </main>
    </div>
  );
}
