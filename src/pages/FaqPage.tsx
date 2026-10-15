import { useI18n } from '../i18n/index.tsx';

const ITEMS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export function FaqPage() {
  const { t } = useI18n();
  return (
    <>
      <div className="page-title">
        <h1>{t('faq.title')}</h1>
        <p>{t('faq.lead')}</p>
      </div>
      <div className="faq">
        {ITEMS.map((n) => (
          <article key={n}>
            <h2>{t(`faq.q${n}`)}</h2>
            <p>{t(`faq.a${n}`)}</p>
          </article>
        ))}
      </div>
    </>
  );
}
