import React, { useState, FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LangToggle } from '../components/LangToggle/LangToggle';
import styles from './LoginPage.module.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const { user, login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  if (user) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!email || !password) {
      setError(t.authFillFields);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      setError(t.authBadCredentials);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginForm}>
        <div className={styles.langRow}>
          <LangToggle />
        </div>
        <h1 className={styles.title}>{t.authTitle}</h1>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              {t.authEmail}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              {t.authPassword}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`${styles.submitButton} ${loading ? styles.loading : ''}`}
          >
            {loading ? t.authSigningIn : t.authSignIn}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
