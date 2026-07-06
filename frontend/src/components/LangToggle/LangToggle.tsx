import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import styles from './LangToggle.module.css';

export const LangToggle: React.FC = () => {
  const { lang, setLang } = useLanguage();
  return (
    <div className={styles.toggle}>
      <button
        className={`${styles.btn} ${lang === 'en' ? styles.active : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        className={`${styles.btn} ${lang === 'fi' ? styles.active : ''}`}
        onClick={() => setLang('fi')}
        aria-pressed={lang === 'fi'}
        aria-label="Vaihda suomeksi"
      >
        FI
      </button>
    </div>
  );
};
