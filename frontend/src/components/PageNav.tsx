import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { LangToggle } from './LangToggle/LangToggle';
import styles from './PageNav.module.css';

export const PageNav: React.FC = () => {
  const { t } = useLanguage();
  return (
    <nav className={styles.pageNav}>
      <NavLink
        to="/jobs"
        className={({ isActive }) => `${styles.navBtn}${isActive ? ` ${styles.navBtnActive}` : ''}`}
      >
        {t.navJobsList}
      </NavLink>
      <NavLink
        to="/dispatcher/board"
        className={({ isActive }) => `${styles.navBtn}${isActive ? ` ${styles.navBtnActive}` : ''}`}
      >
        {t.navDispatcherBoard}
      </NavLink>
      <LangToggle />
    </nav>
  );
};
