import { tracker, type TrackerState } from '../engine/tracker.ts';
import { useI18n } from '../i18n/index.tsx';
import { formatAgo, formatUsd } from '../lib/format.ts';

export function StatusBar({ state, now }: { state: TrackerState; now: number }) {
  const { t, locale } = useI18n();
  const nextIn = state.nextScanAt ? Math.max(0, Math.round((state.nextScanAt - now * 1000) / 1000)) : null;
  const liveLabel = state.paused ? t('status.paused') : state.scanning ? t('status.scanning') : t('status.live');

  return (
    <div className="status" role="status">
      <span className="status__live">
        <span className={`status__dot${state.paused ? '' : ' status__dot--on'}${state.scanning ? ' status__dot--busy' : ''}`} aria-hidden="true" />
        {liveLabel}
      </span>
      <span className="num">
        {state.lastScanAt
          ? t('status.updated', { ago: formatAgo(Math.floor(state.lastScanAt / 1000), now, locale) })
          : t('status.waiting')}
      </span>
      {nextIn !== null && !state.scanning && <span className="num">{t('status.next', { s: nextIn })}</span>}
      <span className="num">{t('status.coins', { n: state.coins.length })}</span>
      {state.solPrice !== null && <span className="num">{t('status.sol', { price: formatUsd(state.solPrice, locale) })}</span>}
      <span className="status__actions">
        <button type="button" className="btn btn--small" onClick={() => tracker.refreshNow()} disabled={state.scanning}>
          {t('status.refresh')}
        </button>
        <button type="button" className="btn btn--small" onClick={() => tracker.setPaused(!state.paused)} aria-pressed={state.paused}>
          {state.paused ? t('status.resume') : t('status.pause')}
        </button>
      </span>
    </div>
  );
}
