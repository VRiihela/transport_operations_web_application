import React from 'react';
import { PageNav } from '../PageNav';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, children }) => (
  <div className={styles.header}>
    <h1 className={styles.heading}>{title}</h1>
    <PageNav />
    <div className={styles.headerActions}>{children}</div>
  </div>
);
