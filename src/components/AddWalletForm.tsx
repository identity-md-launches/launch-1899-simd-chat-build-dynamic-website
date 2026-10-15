import { useId, useState, type FormEvent } from 'react';
import { tracker } from '../engine/tracker.ts';
import { useMediaQuery } from '../engine/useMediaQuery.ts';
import { useI18n } from '../i18n/index.tsx';
import { shortAddress } from '../lib/positions.ts';
import { isSolanaAddress } from '../lib/trades.ts';

export function AddWalletForm({ manualWallets, loadingWallet }: { manualWallets: string[]; loadingWallet: string | null }) {
  const { t } = useI18n();
  const id = useId();
  const wide = useMediaQuery('(min-width: 760px)');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const address = value.trim();
    if (!isSolanaAddress(address)) {
      setError(t('add.error.invalid'));
      document.getElementById(id)?.focus();
      return;
    }
    if (manualWallets.includes(address)) {
      setError(t('add.error.exists'));
      document.getElementById(id)?.focus();
      return;
    }
    setError(null);
    setAdded(address);
    setValue('');
    void tracker.addWallet(address);
  };

  return (
    <details className="card panel" open={wide}>
      <summary>
        {t('add.legend')}
        <span className="caption num">{t('list.count', { n: manualWallets.length })}</span>
      </summary>
    <form onSubmit={submit} noValidate>
      <fieldset>
        <legend className="visually-hidden">{t('add.legend')}</legend>
        <div className="add-row">
          <div className="field">
            <label htmlFor={id}>{t('add.label')}</label>
            <input
              id={id}
              type="text"
              className="mono"
              autoComplete="off"
              spellCheck={false}
              placeholder={t('add.placeholder')}
              value={value}
              onInput={(e) => setValue(e.currentTarget.value)}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? `${id}-error` : `${id}-hint`}
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={loadingWallet !== null}>
            {t('add.button')}
          </button>
        </div>
        {error ? (
          <p id={`${id}-error`} className="form-error">
            {error}
          </p>
        ) : (
          <p id={`${id}-hint`} className="form-hint">
            {t('add.hint')}
          </p>
        )}
        <p role="status" className="form-hint">
          {loadingWallet ? t('add.loading', { address: shortAddress(loadingWallet) }) : added ? t('add.added', { address: shortAddress(added) }) : ''}
        </p>
      </fieldset>
    </form>
    </details>
  );
}
