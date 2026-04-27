import React from 'react';
import { mockJobs, mockDrivers } from './mockData';
import JobPool from './components/JobPool/JobPool';
import DriverColumn from './components/DriverColumn/DriverColumn';
import styles from './DispatcherBoard.module.css';

const DispatcherBoard: React.FC = () => (
  <div className={styles.board}>
    <header className={styles.header}>
      <h1 className={styles.title}>Dispatcher Board</h1>
    </header>

    <JobPool jobs={mockJobs} />

    <section className={styles.driversSection}>
      <h2 className={styles.driversHeading}>Drivers</h2>
      <div className={styles.driverColumns}>
        {mockDrivers.map((driver) => (
          <DriverColumn
            key={driver.id}
            driver={driver}
            jobs={mockJobs.filter((j) => j.assignedDriverId === driver.id)}
          />
        ))}
      </div>
    </section>
  </div>
);

export default DispatcherBoard;
