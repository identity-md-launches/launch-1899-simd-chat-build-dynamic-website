import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { en, type Key } from './en.ts';
import { translations, type LanguageCode } from './languages.ts';
import { load, save } from '../lib/storage.ts';

export const LANGUAGES: { code: LanguageCode; name: string; locale: string }[] = [
  { code: 'en', name: 'English', locale: 'en-US' },
  { code: 'es', name: 'Español', locale: 'es-ES' },
  { code: 'fr', name: 'Français', locale: 'fr-FR' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE' },
  { code: 'pt', name: 'Português', locale: 'pt-BR' },
  { code: 'zh', name: '中文', locale: 'zh-CN' },
];

type Vars = Record<string, string | number>;

interface I18n {
  lang: LanguageCode;
  locale: string;
  setLang: (code: LanguageCode) => void;
  t: (key: Key, vars?: Vars) => string;
}

const I18nContext = createContext<I18n | null>(null);

const isLanguage = (s: string): s is LanguageCode => LANGUAGES.some((l) => l.code === s);

function detectLanguage(): LanguageCode {
  const saved = load<string>('lang', '');
  if (isLanguage(saved)) return saved;
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(detectLanguage);
  const locale = LANGUAGES.find((l) => l.code === lang)?.locale ?? 'en-US';

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((code: LanguageCode) => {
    save('lang', code);
    setLangState(code);
  }, []);

  const t = useCallback(
    (key: Key, vars?: Vars) => {
      const dict = translations[lang];
      let text: string = (dict && dict[key]) || en[key];
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
      return text;
    },
    [lang],
  );

  const value = useMemo<I18n>(() => ({ lang, locale, setLang, t }), [lang, locale, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n needs I18nProvider');
  return ctx;
}
