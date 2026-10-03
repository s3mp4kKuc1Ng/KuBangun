import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getLanguage, LANGUAGE_KEY, updateLanguage, type Language } from './language';

interface LanguageSettings {
  language: Language;
  setLanguage: (language: Language) => void;
  storageError: boolean;
}
export const LanguageContext = createContext<LanguageSettings>({
  language: getLanguage(), setLanguage: () => {}, storageError: false,
});
export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getLanguage);
  const [storageError, setStorageError] = useState(false);
  const value = useMemo<LanguageSettings>(() => ({
    language, storageError,
    setLanguage: (next) => {
      if (next !== 'id' && next !== 'en') return;
      updateLanguage(next);
      setLanguageState(next);
      try { localStorage.setItem(LANGUAGE_KEY, next); setStorageError(false); }
      catch { setStorageError(true); }
    },
  }), [language, storageError]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'KuBangun — Construction & renovation workspace' : 'KuBangun — Ruang kerja pembangunan & renovasi';
  }, [language]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LANGUAGE_KEY && event.key !== null) return;
      const next = event.newValue === 'en' && event.key !== null ? 'en' : 'id';
      updateLanguage(next);
      setLanguageState(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}