import { useId, useState, type FormEvent } from 'react';
import { tracker, type TrackerState } from '../engine/tracker.ts';
import { useI18n } from '../i18n/index.tsx';

export function SourcesPanel({ state }: { state: TrackerState }) {
  const { t } = useI18n();
  const id = useId();
  const [url, setUrl] = useState(state.settings.rpcUrl);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = url.trim();
    if (!/^https:\/\/\S+$/.test(value)) {
      setError(t('sources.error.url'));
      document.getElementById(id)?.focus();
      return;
    }
    setError(null);
    tracker.updateSettings({ rpcUrl: value });
  };

  return (
    <div className="card">
      <details className="sources">
        <summary>{t('sources.title')}</summary>
        <div>
          <p className="small muted">{t('sources.body', { calls: state.rpcCalls })}</p>
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor={id}>{t('sources.rpcLabel')}</label>
              <input
                id={id}
                type="url"
                className="mono"
                autoComplete="url"
                value={url}
                onInput={(e) => setUrl(e.currentTarget.value)}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? `${id}-error` : `${id}-hint`}
              />
            </div>
            {error ? (
              <p id={`${id}-error`} className="form-error">
                {error}
              </p>
            ) : (
              <p id={`${id}-hint`} className="form-hint">
                {t('sources.rpcHint')}
              </p>
            )}
            <div className="form-actions">
              <button type="submit" className="btn">
                {t('sources.save')}
              </button>
            </div>
          </form>
        </div>
      </details>
    </div>
  );
}
