import React from 'react';
import type { Parcel } from '../../../types/jobApi';
import { useLanguage } from '../../../i18n/LanguageContext';
import styles from './ParcelsSection.module.css';
import forms from '../../../styles/forms.module.css';
import buttons from '../../../styles/buttons.module.css';

interface ParcelsSectionProps {
  parcels: Parcel[];
  onChange: (parcels: Parcel[]) => void;
}

/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS or localhost) — this app is
 * also served over plain HTTP on a LAN IP in development, where it's undefined.
 */
function generateClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyParcel(): Parcel {
  return { id: generateClientId(), description: '', quantity: 1 };
}

export const ParcelsSection: React.FC<ParcelsSectionProps> = ({ parcels, onChange }) => {
  const { t } = useLanguage();

  const handleAdd = () => {
    onChange([...parcels, createEmptyParcel()]);
  };

  const handleRemove = (id: string) => {
    onChange(parcels.filter((p) => p.id !== id));
  };

  const handleDescriptionChange = (id: string, value: string) => {
    onChange(parcels.map((p) => (p.id === id ? { ...p, description: value } : p)));
  };

  const handleQuantityChange = (id: string, raw: string) => {
    const parsed = parseInt(raw, 10);
    onChange(
      parcels.map((p) =>
        p.id === id ? { ...p, quantity: Number.isNaN(parsed) || parsed < 1 ? p.quantity : parsed } : p
      )
    );
  };

  return (
    <div className={styles.parcelsSection}>
      <h3 className={styles.sectionTitle}>{t.parcelsTitle}</h3>

      {parcels.length > 0 && (
        <div className={styles.parcelRows}>
          {parcels.map((parcel, index) => (
            <div key={parcel.id} className={styles.parcelRow} role="group" aria-label={`${t.parcelsTitle} ${index + 1}`}>
              <div className={styles.descriptionGroup}>
                <label className={styles.fieldLabel} htmlFor={`parcel-description-${parcel.id}`}>
                  {t.parcelDescriptionLabel}
                </label>
                <input
                  id={`parcel-description-${parcel.id}`}
                  type="text"
                  value={parcel.description}
                  onChange={(e) => handleDescriptionChange(parcel.id, e.target.value)}
                  className={forms.input}
                  autoComplete="off"
                />
              </div>

              <div className={styles.quantityGroup}>
                <label className={styles.fieldLabel} htmlFor={`parcel-quantity-${parcel.id}`}>
                  {t.parcelQuantityLabel}
                </label>
                <input
                  id={`parcel-quantity-${parcel.id}`}
                  type="number"
                  min={1}
                  value={parcel.quantity}
                  onChange={(e) => handleQuantityChange(parcel.id, e.target.value)}
                  className={forms.input}
                />
              </div>

              <button
                type="button"
                className={`${buttons.btn} ${buttons.btnDanger} ${buttons.btnSmall} ${styles.removeButton}`}
                aria-label={`${t.removeParcel} ${index + 1}`}
                onClick={() => handleRemove(parcel.id)}
              >
                {t.removeParcel}
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" className={`${buttons.btn} ${buttons.btnSecondary} ${buttons.btnSmall}`} onClick={handleAdd}>
        {t.addParcel}
      </button>
    </div>
  );
};
