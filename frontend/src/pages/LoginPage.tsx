import React, { useState, FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LangToggle } from '../components/LangToggle/LangToggle';
import styles from './LoginPage.module.css';
import buttons from '../styles/buttons.module.css';
import forms from '../styles/forms.module.css';
import states from '../styles/states.module.css';

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
          <div className={forms.formGroup}>
            <label htmlFor="email" className={forms.label}>
              {t.authEmail}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={forms.input}
              required
              autoComplete="email"
            />
          </div>

          <div className={forms.formGroup}>
            <label htmlFor="password" className={forms.label}>
              {t.authPassword}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={forms.input}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className={states.errorBanner} role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`${buttons.btn} ${buttons.btnPrimary}`}
          >
            {loading ? t.authSigningIn : t.authSignIn}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
