import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './PageNav.module.css';

export const PageNav: React.FC = () => (
  <nav className={styles.pageNav}>
    <NavLink
      to="/jobs"
      className={({ isActive }) => `${styles.navBtn}${isActive ? ` ${styles.navBtnActive}` : ''}`}
    >
      Jobs List
    </NavLink>
    <NavLink
      to="/dispatcher/board"
      className={({ isActive }) => `${styles.navBtn}${isActive ? ` ${styles.navBtnActive}` : ''}`}
    >
      Dispatcher Board
    </NavLink>
  </nav>
);
