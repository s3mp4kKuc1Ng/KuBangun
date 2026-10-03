export type Language = 'id' | 'en';
export const LANGUAGE_KEY = 'kubangun.language.v1';

function readLanguage(): Language {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'id';
  } catch { return 'id'; }
}

interface LanguageState { language: Language; listeners: Set<() => void> }
// Vite can load the local JSX runtime through a prebundled entry. Share this
// presentation-only store across that entry and normal application modules.
const STORE = Symbol.for('kubangun.language.store');
function state(): LanguageState {
  const scope = globalThis as typeof globalThis & { [STORE]?: LanguageState };
  return scope[STORE] ?? (scope[STORE] = { language: readLanguage(), listeners: new Set() });
}
export const getLanguage = () => state().language;
export const getLocale = () => getLanguage() === 'en' ? 'en-GB' : 'id-ID';
export const subscribeLanguage = (listener: () => void) => {
  state().listeners.add(listener);
  return () => { state().listeners.delete(listener); };
};
export function updateLanguage(language: Language) {
  if (state().language === language) return;
  state().language = language;
  state().listeners.forEach((listener) => listener());
}