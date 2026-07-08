import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { LangToggle } from '../LangToggle/LangToggle';
import buttons from '../../styles/buttons.module.css';
import styles from './TopBar.module.css';

interface TopBarProps {
  title: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const role = user?.role;

  const navItems: { to: string; label: string }[] = [];
  if (role === 'Admin' || role === 'Dispatcher') {
    navItems.push({ to: '/jobs', label: t.navJobsList });
    navItems.push({ to: '/dispatcher/board', label: t.navDispatcherBoard });
  }
  if (role === 'Admin') {
    navItems.push({ to: '/users', label: t.usersLink });
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
    `${styles.navBtn}${isActive ? ` ${styles.navBtnActive}` : ''}`;

  return (
    <div className={styles.topBar}>
      <h1 className={styles.heading}>{title}</h1>
      {navItems.length > 0 && (
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
      <div className={styles.actions}>
        <LangToggle />
        <button className={`${buttons.btn} ${buttons.btnSecondary}`} onClick={() => void logout()}>
          {t.logout}
        </button>
      </div>
    </div>
  );
};
