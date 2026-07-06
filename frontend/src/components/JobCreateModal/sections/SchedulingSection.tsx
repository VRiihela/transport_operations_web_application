import React from 'react';
import { SchedulingType, SchedulingData } from '../../../types/job';
import { useLanguage } from '../../../i18n/LanguageContext';
import styles from './SchedulingSection.module.css';

interface SchedulingSectionProps {
  data: SchedulingData;
  onChange: (data: SchedulingData) => void;
}

export const SchedulingSection: React.FC<SchedulingSectionProps> = ({ data, onChange }) => {
  const { t } = useLanguage();
  const handleTypeChange = (type: SchedulingType) => {
    onChange({
      ...data,
      type,
      // Preserve date across all types; only clear type-specific fields
      exactTime: type === SchedulingType.EXACT_TIME ? data.exactTime : '',
      windowStart: type === SchedulingType.TIME_WINDOW ? data.windowStart : '',
      windowEnd: type === SchedulingType.TIME_WINDOW ? data.windowEnd : '',
      schedulingNote: type === SchedulingType.TBC ? data.schedulingNote : '',
    });
  };

  const handleInputChange =
    (field: keyof SchedulingData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...data, [field]: e.target.value });
    };

  const segmentOptions = [
    { value: SchedulingType.EXACT_TIME, label: t.schedExactTime },
    { value: SchedulingType.TIME_WINDOW, label: t.schedTimeWindow },
    { value: SchedulingType.TBC, label: t.schedTbc },
  ];

  const renderSchedulingInputs = () => {
    switch (data.type) {
      case SchedulingType.EXACT_TIME:
        return (
          <div className={styles.schedulingInputs}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                {t.schedDate} <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={data.date}
                onChange={handleInputChange('date')}
                className={styles.dateInput}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                {t.schedStartTime} <span className={styles.required}>*</span>
              </label>
              <input
                type="time"
                value={data.exactTime}
                onChange={handleInputChange('exactTime')}
                className={styles.timeInput}
                required
              />
            </div>
          </div>
        );

      case SchedulingType.TIME_WINDOW:
        return (
          <div className={styles.schedulingInputs}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                {t.schedDate} <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={data.date}
                onChange={handleInputChange('date')}
                className={styles.dateInput}
                required
              />
            </div>
            <div className={styles.timeWindow}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  {t.schedWindowStart} <span className={styles.required}>*</span>
                </label>
                <input
                  type="time"
                  value={data.windowStart}
                  onChange={handleInputChange('windowStart')}
                  className={styles.timeInput}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  {t.schedWindowEnd} <span className={styles.required}>*</span>
                </label>
                <input
                  type="time"
                  value={data.windowEnd}
                  onChange={handleInputChange('windowEnd')}
                  className={styles.timeInput}
                  required
                />
              </div>
            </div>
          </div>
        );

      case SchedulingType.TBC:
        return (
          <div className={styles.schedulingInputs}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                {t.schedNote} <span className={styles.required}>*</span>
              </label>
              <textarea
                value={data.schedulingNote}
                onChange={handleInputChange('schedulingNote')}
                className={styles.noteTextarea}
                placeholder={t.schedNotePlaceholder}
                rows={3}
                required
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.schedulingSection}>
      <h3 className={styles.sectionTitle}>{t.schedTitle}</h3>

      <div className={styles.segmentControl}>
        {segmentOptions.map((option) => (
          <label key={option.value} className={styles.segmentOption}>
            <input
              type="radio"
              name="schedulingType"
              value={option.value}
              checked={data.type === option.value}
              onChange={() => handleTypeChange(option.value)}
              className={styles.segmentRadio}
            />
            <span className={styles.segmentLabel}>{option.label}</span>
          </label>
        ))}
      </div>

      {renderSchedulingInputs()}
    </div>
  );
};
