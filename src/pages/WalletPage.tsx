import { useMemo, useState } from 'react';
import { PnlBars, type BarDatum } from '../components/Charts.tsx';
import { PositionsTable } from '../components/PositionsTable.tsx';
import { tracker } from '../engine/tracker.ts';
import { useNow, useTracker } from '../engine/useTracker.ts';
import { useI18n } from '../i18n/index.tsx';
import { formatDuration, formatUsd } from '../lib/format.ts';
import { holdSeconds, profitLoss, shortAddress } from '../lib/positions.ts';
import { isSolanaAddress } from '../lib/trades.ts';

export function WalletPage({ address }: { address: string }) {
  const state = useTracker();
  const now = useNow();
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);

  const positions = useMemo(() => state.positions.filter((p) => p.wallet === address), [state.positions, address]);
  const open = positions.filter((p) => p.status === 'open');
  const sold = positions.filter((p) => p.status === 'sold');
  const watched = state.manualWallets.includes(address);
  const loading = state.loadingWallet === address;

  const spent = positions.reduce((a, p) => a + p.costUsd, 0);
  const received = positions.reduce((a, p) => a + p.proceedsUsd + (p.status === 'open' && p.currentPriceUsd ? p.tokensHeld * p.currentPriceUsd : 0), 0);
  const pnl = positions.reduce((a, p) => a + profitLoss(p).usd, 0);
  const avgHold = positions.length ? positions.reduce((a, p) => a + holdSeconds(p, now), 0) / positions.length : null;
  const buys = positions.reduce((a, p) => a + p.buySignatures.length, 0);
  const sells = positions.reduce((a, p) => a + p.sellSignatures.length, 0);

  const chart: BarDatum[] = positions
    .filter((p) => profitLoss(p).priceKnown)
    .map((p) => ({ key: p.id, label: p.symbol, value: profitLoss(p).usd }))
    .sort((a, b) => b.value - a.value);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!isSolanaAddress(address)) {
    return (
      <div className="page-title">
        <h1>{t('wallet.title', { address })}</h1>
        <p>{t('wallet.invalid')}</p>
        <p>
          <a href="#/">{t('wallet.back')}</a>
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="small">
        <a href="#/">{t('wallet.back')}</a>
      </p>
      <div className="page-title" style={{ marginBlockStart: 'var(--space-3)' }}>
        <h1>{t('wallet.title', { address: shortAddress(address) })}</h1>
        <div className="address-line">
          <code>{address}</code>
          <button type="button" className="btn btn--small" onClick={copy}>
            {t('wallet.copy')}
          </button>
          <a className="btn btn--small" href={`https://solscan.io/account/${address}`} target="_blank" rel="noopener noreferrer">
            {t('wallet.solscan')}
          </a>
          <span role="status" className="caption">
            {copied ? t('wallet.copied') : ''}
          </span>
        </div>
      </div>

      <div className="stack">
        {!watched && (
          <div className="notice notice--warn">
            <p>{t('wallet.notTracked')}</p>
          </div>
        )}
        <div className="actions-row">
          {watched ? (
            <button type="button" className="btn" onClick={() => tracker.removeWallet(address)}>
              {t('wallet.unwatch')}
            </button>
          ) : (
            <button type="button" className="btn btn--primary" disabled={loading} onClick={() => void tracker.addWallet(address)}>
              {t('wallet.watch')}
            </button>
          )}
        </div>
        {loading && (
          <p role="status" className="small muted">
            {t('add.loading', { address: shortAddress(address) })}
          </p>
        )}

        <dl className="stats">
          <div className="stat">
            <dt>{t('wallet.spent')}</dt>
            <dd>{formatUsd(spent, locale)}</dd>
          </div>
          <div className="stat">
            <dt>{t('wallet.received')}</dt>
            <dd>{formatUsd(received, locale)}</dd>
          </div>
          <div className="stat">
            <dt>{t('wallet.pnl')}</dt>
            <dd>{positions.length ? formatUsd(pnl, locale, { sign: true }) : t('stats.none')}</dd>
          </div>
          <div className="stat">
            <dt>{t('wallet.avgHold')}</dt>
            <dd>{avgHold === null ? t('stats.none') : formatDuration(avgHold, locale)}</dd>
          </div>
          <div className="stat">
            <dt>{t('wallet.tx')}</dt>
            <dd>
              {t('wallet.buys', { n: buys })}, {t('wallet.sells', { n: sells })}
            </dd>
          </div>
        </dl>

        <section className="card" aria-labelledby="wallet-open">
          <div className="card__head">
            <h2 id="wallet-open">{t('list.openTitle')}</h2>
            <p className="num">{t('list.count', { n: open.length })}</p>
          </div>
          {open.length === 0 ? <p className="small muted">{positions.length === 0 && watched && !loading ? t('wallet.empty') : t('list.empty.sold')}</p> : <PositionsTable positions={open} now={now} mode="open" showWallet={false} />}
        </section>
        <section className="card" aria-labelledby="wallet-sold">
          <div className="card__head">
            <h2 id="wallet-sold">{t('list.soldTitle')}</h2>
            <p className="num">{t('list.count', { n: sold.length })}</p>
          </div>
          {sold.length === 0 ? <p className="small muted">{t('list.empty.sold')}</p> : <PositionsTable positions={sold} now={now} mode="sold" showWallet={false} />}
        </section>
        <div className="card">
          <PnlBars data={chart} title={t('wallet.chartTitle')} description={t('charts.pnlDesc')} />
        </div>
      </div>
    </>
  );
}
