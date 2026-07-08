import React, { useState, useEffect } from 'react';
import { Driver, Team } from '../../types';
import { useLanguage } from '../../../../i18n/LanguageContext';
import styles from './TeamManagementModal.module.css';
import buttons from '../../../../styles/buttons.module.css';
import forms from '../../../../styles/forms.module.css';
import states from '../../../../styles/states.module.css';

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
  const { t } = useLanguage();
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
      setFormError(t.teamNameRequired);
      return;
    }
    if (name.length > 100) {
      setFormError(t.teamNameTooLong);
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
          <h2 className={styles.title}>{t.teamCreateTitle}</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={submitting}
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="team-name-input" className={styles.label}>
              {t.teamNameLabel}
            </label>
            <input
              id="team-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={submitting}
              className={forms.input}
              placeholder={t.teamNamePlaceholder}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t.teamDriversLabel}</label>
            <div className={styles.driverList}>
              {drivers.length === 0 ? (
                <p className={styles.emptyDrivers}>{t.teamNoDrivers}</p>
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
                        <span className={styles.unavailableBadge}>{t.teamInTeam}</span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {formError && <div className={states.errorBanner}>{formError}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`${buttons.btn} ${buttons.btnSecondary}`}
            >
              {t.cancel}
            </button>
            <button type="submit" disabled={submitting} className={`${buttons.btn} ${buttons.btnPrimary}`}>
              {submitting ? t.teamCreating : t.teamCreate}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamManagementModal;
