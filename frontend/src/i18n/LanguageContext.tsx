import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Lang, AppTranslations, translations } from './translations';

const STORAGE_KEY = 'ff_lang';

function getInitialLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'fi' ? 'fi' : 'en';
}

interface LanguageContextValue {
  t: AppTranslations;
  lang: Lang;
  setLang: (lang: Lang) => void;
  fmtDateTime: (value: string | null | undefined, fallback?: string) => string;
  fmtTime: (value: string) => string;
  isSameHelsinkiDay: (a: string, b: string) => boolean;
  statusLabel: (status: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = translations[lang];

  const fmtDateTime = useCallback(
    (value: string | null | undefined, fallback = ''): string => {
      if (!value) return fallback;
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleString(t.dateLocale, {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Helsinki',
      });
    },
    [t.dateLocale],
  );

  const fmtTime = useCallback(
    (value: string): string =>
      new Date(value).toLocaleTimeString(t.dateLocale, {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Helsinki',
      }),
    [t.dateLocale],
  );

  const isSameHelsinkiDay = useCallback((a: string, b: string): boolean => {
    const toISO = (v: string) =>
      new Date(v).toLocaleDateString('en-CA', { timeZone: 'Europe/Helsinki' });
    return toISO(a) === toISO(b);
  }, []);

  const statusLabel = useCallback(
    (status: string): string => {
      const map: Record<string, keyof AppTranslations> = {
        DRAFT: 'statusDraft',
        ASSIGNED: 'statusAssigned',
        IN_PROGRESS: 'statusInProgress',
        COMPLETED: 'statusCompleted',
      };
      const key = map[status];
      return key ? String(t[key]) : status.replace('_', ' ');
    },
    [t],
  );

  const value = useMemo(
    () => ({ t, lang, setLang, fmtDateTime, fmtTime, isSameHelsinkiDay, statusLabel }),
    [t, lang, setLang, fmtDateTime, fmtTime, isSameHelsinkiDay, statusLabel],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
