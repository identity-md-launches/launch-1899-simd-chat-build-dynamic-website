import { useI18n } from '../i18n/index.tsx';
import { formatDuration, formatPercent, formatUsd } from '../lib/format.ts';
import type { Aggregates } from '../lib/positions.ts';

export function StatTiles({ agg }: { agg: Aggregates }) {
  const { t, locale } = useI18n();
  const none = t('stats.none');
  const tiles: { label: string; value: string }[] = [
    { label: t('stats.open'), value: String(agg.open) },
    { label: t('stats.sold'), value: String(agg.sold) },
    { label: t('stats.avgHoldOpen'), value: agg.avgHoldOpen === null ? none : formatDuration(agg.avgHoldOpen, locale) },
    { label: t('stats.avgHoldSold'), value: agg.avgHoldSold === null ? none : formatDuration(agg.avgHoldSold, locale) },
    { label: t('stats.avgPnlOpen'), value: agg.avgPnlOpen === null ? none : formatUsd(agg.avgPnlOpen, locale, { sign: true }) },
    { label: t('stats.avgPnlSold'), value: agg.avgPnlSold === null ? none : formatUsd(agg.avgPnlSold, locale, { sign: true }) },
    { label: t('stats.winRate'), value: agg.winRate === null ? none : formatPercent(agg.winRate, locale) },
  ];
  return (
    <dl className="stats">
      {tiles.map((tile) => (
        <div className="stat" key={tile.label}>
          <dt>{tile.label}</dt>
          <dd>{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}
