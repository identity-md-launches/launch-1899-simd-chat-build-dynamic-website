import { LANGUAGES, useI18n } from '../i18n/index.tsx';
import type { LanguageCode } from '../i18n/languages.ts';

export function Header({ active }: { active: string }) {
  const { t, lang, setLang } = useI18n();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="brand" href="#/">
          <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <rect width="64" height="64" rx="14" fill="#16191e" />
            <path d="M14 42 L26 30 L34 36 L50 20" fill="none" stroke="#5aa0f2" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="20" r="6" fill="#5aa0f2" />
          </svg>
          <span>{t('app.name')}</span>
        </a>
        <nav className="site-nav" aria-label={t('nav.dashboard')}>
          <a href="#/" aria-current={active === 'dashboard' ? 'page' : undefined}>
            {t('nav.dashboard')}
          </a>
          <a href="#/faq" aria-current={active === 'faq' ? 'page' : undefined}>
            {t('nav.faq')}
          </a>
        </nav>
        <label className="lang">
          <span className="visually-hidden">{t('nav.language')}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value as LanguageCode)} aria-label={t('nav.language')}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
