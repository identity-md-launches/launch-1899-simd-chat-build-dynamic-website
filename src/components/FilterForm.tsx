import { useId, useState, type FormEvent } from 'react';
import { tracker } from '../engine/tracker.ts';
import { useMediaQuery } from '../engine/useMediaQuery.ts';
import { useI18n } from '../i18n/index.tsx';
import { formatCompactUsd, formatUsd } from '../lib/format.ts';
import { DEFAULT_SETTINGS, type Settings } from '../lib/types.ts';

interface Draft {
  minBuyUsd: string;
  maxBuyUsd: string;
  minMcapUsd: string;
  maxMcapUsd: string;
  maxTracked: string;
  refreshSeconds: string;
}

const toDraft = (s: Settings): Draft => ({
  minBuyUsd: String(s.minBuyUsd),
  maxBuyUsd: String(s.maxBuyUsd),
  minMcapUsd: String(s.minMcapUsd),
  maxMcapUsd: s.maxMcapUsd === null ? '' : String(s.maxMcapUsd),
  maxTracked: String(s.maxTracked),
  refreshSeconds: String(s.refreshSeconds),
});

export function FilterForm({ settings }: { settings: Settings }) {
  const { t, locale } = useI18n();
  const id = useId();
  const wide = useMediaQuery('(min-width: 760px)');
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});

  const update = (key: keyof Draft) => (e: FormEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: e.currentTarget.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<keyof Draft, string>> = {};
    const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
    const minBuy = num(draft.minBuyUsd);
    const maxBuy = num(draft.maxBuyUsd);
    const minMcap = num(draft.minMcapUsd);
    const maxMcap = draft.maxMcapUsd.trim() === '' ? null : num(draft.maxMcapUsd);
    const maxTracked = num(draft.maxTracked);
    const refresh = num(draft.refreshSeconds);
    if (!(minBuy >= 0)) next.minBuyUsd = t('filters.error.min', { min: 0 });
    if (!(maxBuy >= 1)) next.maxBuyUsd = t('filters.error.min', { min: 1 });
    if (minBuy >= 0 && maxBuy >= 1 && minBuy >= maxBuy) next.minBuyUsd = t('filters.error.range');
    if (!(minMcap >= 0)) next.minMcapUsd = t('filters.error.min', { min: 0 });
    if (maxMcap !== null && !(maxMcap >= 1)) next.maxMcapUsd = t('filters.error.min', { min: 1 });
    if (maxMcap !== null && minMcap >= 0 && minMcap >= maxMcap) next.minMcapUsd = t('filters.error.range');
    if (!(maxTracked >= 1 && Number.isInteger(maxTracked))) next.maxTracked = t('filters.error.min', { min: 1 });
    if (!(refresh >= 15 && Number.isInteger(refresh))) next.refreshSeconds = t('filters.error.min', { min: 15 });
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    tracker.updateSettings({ minBuyUsd: minBuy, maxBuyUsd: maxBuy, minMcapUsd: minMcap, maxMcapUsd: maxMcap, maxTracked, refreshSeconds: refresh });
  };

  const reset = () => {
    setDraft(toDraft({ ...DEFAULT_SETTINGS, rpcUrl: settings.rpcUrl }));
    setErrors({});
    tracker.updateSettings({ ...DEFAULT_SETTINGS, rpcUrl: settings.rpcUrl });
  };

  const field = (key: keyof Draft, label: string, min: number, step: number, hint?: string) => (
    <div className="field">
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <input
        id={`${id}-${key}`}
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        value={draft[key]}
        onInput={update(key)}
        aria-invalid={errors[key] ? 'true' : undefined}
        aria-describedby={errors[key] ? `${id}-${key}-error` : hint ? `${id}-${key}-hint` : undefined}
      />
      {hint && !errors[key] && (
        <span id={`${id}-${key}-hint`} className="caption">
          {hint}
        </span>
      )}
      {errors[key] && (
        <span id={`${id}-${key}-error`} className="form-error" style={{ marginBlockStart: 0 }}>
          {errors[key]}
        </span>
      )}
    </div>
  );

  const summary = `${formatUsd(settings.minBuyUsd, locale)} – ${formatUsd(settings.maxBuyUsd, locale)}, ${formatCompactUsd(settings.minMcapUsd, locale)} – ${settings.maxMcapUsd === null ? '∞' : formatCompactUsd(settings.maxMcapUsd, locale)}`;

  return (
    <details className="card panel" open={wide}>
      <summary>
        {t('filters.legend')}
        <span className="caption num">{summary}</span>
      </summary>
    <form onSubmit={submit} noValidate>
      <fieldset>
        <legend className="visually-hidden">{t('filters.legend')}</legend>
        <div className="field-grid">
          {field('minBuyUsd', t('filters.buyMin'), 0, 1)}
          {field('maxBuyUsd', t('filters.buyMax'), 1, 1)}
          {field('minMcapUsd', t('filters.mcapMin'), 0, 1000)}
          {field('maxMcapUsd', t('filters.mcapMax'), 1, 1000, t('filters.mcapMaxHint'))}
          {field('maxTracked', t('filters.maxTracked'), 1, 1)}
          {field('refreshSeconds', t('filters.refresh'), 15, 5)}
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            {t('filters.apply')}
          </button>
          <button type="button" className="btn" onClick={reset}>
            {t('filters.reset')}
          </button>
        </div>
      </fieldset>
    </form>
    </details>
  );
}
