import React, { useState, useEffect } from 'react';
import { Driver, Team } from '../../types';
import styles from './TeamManagementModal.module.css';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, driverIds: string[]) => Promise<Team>;
  drivers: Driver[];
  driversInTeams: Set<string>;
}

const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  drivers,
  driversInTeams,
}) => {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSelected(new Set());
      setFormError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggle = (id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Team name is required');
      return;
    }
    if (name.length > 100) {
      setFormError('Team name must be 100 characters or less');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onCreate(name.trim(), Array.from(selected));
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-label="Create team">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create Team</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="team-name-input" className={styles.label}>
              Team name
            </label>
            <input
              id="team-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={submitting}
              className={styles.input}
              placeholder="e.g. Morning Route A"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Drivers</label>
            <div className={styles.driverList}>
              {drivers.length === 0 ? (
                <p className={styles.emptyDrivers}>No drivers available.</p>
              ) : (
                drivers.map((driver) => {
                  const alreadyInTeam =
                    driversInTeams.has(driver.id) && !selected.has(driver.id);
                  return (
                    <label
                      key={driver.id}
                      className={`${styles.driverRow} ${alreadyInTeam ? styles.driverRowUnavailable : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(driver.id)}
                        onChange={() => toggle(driver.id)}
                        disabled={submitting || alreadyInTeam}
                      />
                      <span className={styles.driverName}>{driver.name}</span>
                      {alreadyInTeam && (
                        <span className={styles.unavailableBadge}>in team</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {formError && <p className={styles.formError}>{formError}</p>}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              {submitting ? 'Creating…' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamManagementModal;
