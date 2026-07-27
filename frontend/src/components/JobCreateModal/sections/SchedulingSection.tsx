import React from 'react';
import { SchedulingType, SchedulingData } from '../../../types/job';
import { useLanguage } from '../../../i18n/LanguageContext';
import styles from './SchedulingSection.module.css';
import forms from '../../../styles/forms.module.css';

interface SchedulingSectionProps {
  data: SchedulingData;
  onChange: (data: SchedulingData) => void;
}

export const SchedulingSection: React.FC<SchedulingSectionProps> = ({ data, onChange }) => {
  const { t } = useLanguage();
  const hasWindowFields = (type: SchedulingType): boolean =>
    type === SchedulingType.ARRIVAL_WINDOW || type === SchedulingType.DURATION;

  const handleTypeChange = (type: SchedulingType) => {
    onChange({
      ...data,
      type,
      // Preserve date across all types; only clear type-specific fields
      exactTime: type === SchedulingType.EXACT_TIME ? data.exactTime : '',
      windowStart: hasWindowFields(type) ? data.windowStart : '',
      windowEnd: hasWindowFields(type) ? data.windowEnd : '',
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
    { value: SchedulingType.ARRIVAL_WINDOW, label: t.schedArrivalWindow },
    { value: SchedulingType.DURATION, label: t.schedDuration },
    { value: SchedulingType.TBC, label: t.schedTbc },
  ];

  const renderSchedulingInputs = () => {
    switch (data.type) {
      case SchedulingType.EXACT_TIME:
        return (
          <div className={styles.schedulingInputs}>
            <div className={styles.inputGroup}>
              <label className={forms.label}>
                {t.schedDate} <span className={forms.required}>*</span>
              </label>
              <input
                type="date"
                lang="fi-FI"
                value={data.date}
                onChange={handleInputChange('date')}
                className={forms.input}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={forms.label}>
                {t.schedStartTime} <span className={forms.required}>*</span>
              </label>
              <input
                type="time"
                lang="fi-FI"
                value={data.exactTime}
                onChange={handleInputChange('exactTime')}
                className={forms.input}
                required
              />
            </div>
          </div>
        );

      case SchedulingType.ARRIVAL_WINDOW:
      case SchedulingType.DURATION: {
        const windowEndLabel =
          data.type === SchedulingType.ARRIVAL_WINDOW ? t.schedArrivalWindowEnd : t.schedWindowEnd;
        return (
          <div className={styles.schedulingInputs}>
            <div className={styles.inputGroup}>
              <label className={forms.label}>
                {t.schedDate} <span className={forms.required}>*</span>
              </label>
              <input
                type="date"
                lang="fi-FI"
                value={data.date}
                onChange={handleInputChange('date')}
                className={forms.input}
                required
              />
            </div>
            <div className={styles.timeWindow}>
              <div className={styles.inputGroup}>
                <label className={forms.label}>
                  {t.schedWindowStart} <span className={forms.required}>*</span>
                </label>
                <input
                  type="time"
                  lang="fi-FI"
                  value={data.windowStart}
                  onChange={handleInputChange('windowStart')}
                  className={forms.input}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={forms.label}>
                  {windowEndLabel} <span className={forms.required}>*</span>
                </label>
                <input
                  type="time"
                  lang="fi-FI"
                  value={data.windowEnd}
                  onChange={handleInputChange('windowEnd')}
                  className={forms.input}
                  required
                />
              </div>
            </div>
          </div>
        );
      }

      case SchedulingType.TBC:
        return (
          <div className={styles.schedulingInputs}>
            <div className={styles.inputGroup}>
              <label className={forms.label}>
                {t.schedNote} <span className={forms.required}>*</span>
              </label>
              <textarea
                value={data.schedulingNote}
                onChange={handleInputChange('schedulingNote')}
                className={forms.textarea}
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
