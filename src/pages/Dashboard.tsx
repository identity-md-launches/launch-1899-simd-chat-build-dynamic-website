import { useMemo } from 'react';
import { AddWalletForm } from '../components/AddWalletForm.tsx';
import { Histogram, PnlBars, type BarDatum } from '../components/Charts.tsx';
import { FilterForm } from '../components/FilterForm.tsx';
import { PositionsTable } from '../components/PositionsTable.tsx';
import { SourcesPanel } from '../components/SourcesPanel.tsx';
import { StatTiles } from '../components/StatTiles.tsx';
import { StatusBar } from '../components/StatusBar.tsx';
import { useNow, useTracker } from '../engine/useTracker.ts';
import { useI18n } from '../i18n/index.tsx';
import { formatUsd } from '../lib/format.ts';
import { aggregate, holdSeconds, profitLoss, shortAddress } from '../lib/positions.ts';
import type { Position } from '../lib/types.ts';

const BUCKETS: { key: string; max: number }[] = [
  { key: 'bucket.lt5m', max: 5 * 60 },
  { key: 'bucket.5to15m', max: 15 * 60 },
  { key: 'bucket.15to60m', max: 60 * 60 },
  { key: 'bucket.1to6h', max: 6 * 3600 },
  { key: 'bucket.6to24h', max: 24 * 3600 },
  { key: 'bucket.gt1d', max: Infinity },
];

export function holdBuckets(positions: Position[], now: number, label: (key: string) => string): BarDatum[] {
  const counts = BUCKETS.map(() => 0);
  for (const p of positions) {
    const s = holdSeconds(p, now);
    const i = BUCKETS.findIndex((b) => s < b.max);
    counts[i < 0 ? BUCKETS.length - 1 : i] += 1;
  }
  return BUCKETS.map((b, i) => ({ key: b.key, label: label(b.key), value: counts[i] }));
}

export function Dashboard() {
  const state = useTracker();
  const now = useNow();
  const { t, locale } = useI18n();

  const open = state.positions.filter((p) => p.status === 'open');
  const sold = state.positions.filter((p) => p.status === 'sold');
  const agg = useMemo(() => aggregate(state.positions, now), [state.positions, now]);

  const pnlData: BarDatum[] = useMemo(
    () =>
      state.positions
        .filter((p) => profitLoss(p).priceKnown)
        .sort((a, b) => profitLoss(b).usd - profitLoss(a).usd)
        .slice(0, 20)
        .map((p) => ({ key: p.id, label: `${shortAddress(p.wallet)} ${p.symbol}`, value: profitLoss(p).usd })),
    [state.positions],
  );
  const holdData = useMemo(
    () => holdBuckets(state.positions, now, (k) => t(k as Parameters<typeof t>[0])),
    [state.positions, now, t],
  );

  return (
    <>
      <div className="page-title">
        <h1>{t('dash.title')}</h1>
        <p>{t('dash.lead')}</p>
      </div>
      <div className="dashboard">
        <div className="stack">
          <FilterForm key={JSON.stringify(state.settings)} settings={state.settings} />
          <AddWalletForm manualWallets={state.manualWallets} loadingWallet={state.loadingWallet} />
          <StatusBar state={state} now={now} />
          {state.error && (
            <div className="notice notice--error" role="alert">
              <p>{t(`error.${state.error}`)}</p>
              {state.errorDetail && <p className="caption">{t('error.detail', { detail: state.errorDetail })}</p>}
            </div>
          )}
          <section className="card" aria-labelledby="open-title">
            <div className="card__head">
              <h2 id="open-title">{t('list.openTitle')}</h2>
              <p className="num">{t('list.count', { n: open.length })}</p>
            </div>
            {open.length === 0 ? (
              <p className="small muted">
                {t('list.empty.open', { min: formatUsd(state.settings.minBuyUsd, locale), max: formatUsd(state.settings.maxBuyUsd, locale) })}
              </p>
            ) : (
              <PositionsTable positions={open} now={now} mode="open" />
            )}
          </section>
          <section className="card" aria-labelledby="sold-title">
            <div className="card__head">
              <h2 id="sold-title">{t('list.soldTitle')}</h2>
              <p className="num">{t('list.count', { n: sold.length })}</p>
            </div>
            {sold.length === 0 ? <p className="small muted">{t('list.empty.sold')}</p> : <PositionsTable positions={sold.slice(-30)} now={now} mode="sold" />}
          </section>
        </div>
        <aside className="stack" aria-label={t('stats.open')}>
          <StatTiles agg={agg} />
          <div className="card">
            <PnlBars data={pnlData} title={t('charts.pnlTitle')} description={t('charts.pnlDesc')} />
          </div>
          <div className="card">
            <Histogram data={holdData} title={t('charts.holdTitle')} description={t('charts.holdDesc')} />
          </div>
          <SourcesPanel state={state} />
        </aside>
      </div>
    </>
  );
}
