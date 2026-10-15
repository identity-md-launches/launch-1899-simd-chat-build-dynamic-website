import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.tsx';
import { formatUsd } from '../lib/format.ts';

/** Width of the chart's container in CSS pixels, so text keeps its real size at every viewport. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
}

/** Horizontal diverging bars around a zero line: gains in blue to the right, losses in red to the left. */
export function PnlBars({ data, title, description }: { data: BarDatum[]; title: string; description: string }) {
  const { t, locale } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  const rowH = 26;
  const barH = 14;
  const labelW = Math.min(150, Math.max(96, width * 0.32));
  const padR = 64;
  const height = data.length * rowH + 8;
  const plotW = Math.max(40, width - labelW - padR);
  const negExtent = Math.max(0, ...data.map((d) => -d.value));
  const posExtent = Math.max(0, ...data.map((d) => d.value));
  const total = negExtent + posExtent || 1;
  const zeroX = labelW + (negExtent > 0 ? padR : 0) + (plotW - (negExtent > 0 ? padR : 0)) * (negExtent / total);
  const scale = (v: number) => (Math.abs(v) / total) * (plotW - (negExtent > 0 ? padR : 0));

  return (
    <figure className="chart" ref={ref} style={{ margin: 0 }}>
      <figcaption>
        <h3>{title}</h3>
        <p className="caption">{description}</p>
      </figcaption>
      {data.length === 0 ? (
        <p className="small muted">{t('charts.empty')}</p>
      ) : (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          <line x1={zeroX} x2={zeroX} y1={0} y2={height} stroke="var(--color-border-strong)" strokeWidth={1} />
          {data.map((d, i) => {
            const y = i * rowH + 4;
            const w = Math.max(scale(d.value), d.value === 0 ? 0 : 2);
            const gain = d.value >= 0;
            const x = gain ? zeroX + 1 : zeroX - 1 - w;
            const valueText = formatUsd(d.value, locale, { sign: true });
            return (
              <g key={d.key} className="bar">
                <title>{`${d.label}: ${valueText}`}</title>
                <text x={labelW - 8} y={y + barH / 2 + 4} textAnchor="end" className="chart__label">
                  {d.label}
                </text>
                <rect x={x} y={y} width={w} height={barH} rx={gain ? 4 : 4} fill={gain ? 'var(--color-gain)' : 'var(--color-loss)'} />
                <text x={gain ? x + w + 6 : x - 6} y={y + barH / 2 + 4} textAnchor={gain ? 'start' : 'end'}>
                  {valueText}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {data.length > 0 && (
        <details>
          <summary>{t('charts.table')}</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">{t('col.wallet')}</th>
                <th scope="col" className="num">
                  {t('charts.value')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td className="num">{formatUsd(d.value, locale, { sign: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}

/** Columns for a small set of ordered buckets, one series, counts on the caps. */
export function Histogram({ data, title, description }: { data: BarDatum[]; title: string; description: string }) {
  const { t } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = 180;
  const padTop = 20;
  const padBottom = 36;
  const plotH = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = width / Math.max(1, data.length);
  const barW = Math.min(24, slot * 0.6);
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <figure className="chart" ref={ref} style={{ margin: 0 }}>
      <figcaption>
        <h3>{title}</h3>
        <p className="caption">{description}</p>
      </figcaption>
      {total === 0 ? (
        <p className="small muted">{t('charts.empty')}</p>
      ) : (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          <line x1={0} x2={width} y1={padTop + plotH} y2={padTop + plotH} stroke="var(--color-border-strong)" strokeWidth={1} />
          {data.map((d, i) => {
            const h = (d.value / max) * plotH;
            const x = i * slot + (slot - barW) / 2;
            const y = padTop + plotH - h;
            return (
              <g key={d.key} className="bar">
                <title>{`${d.label}: ${d.value}`}</title>
                {d.value > 0 && <rect x={x} y={y} width={barW} height={h} rx={4} fill="var(--color-gain)" />}
                {d.value > 0 && (
                  <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="chart__label">
                    {d.value}
                  </text>
                )}
                <text x={i * slot + slot / 2} y={height - 14} textAnchor="middle">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {total > 0 && (
        <details>
          <summary>{t('charts.table')}</summary>
          <table>
            <thead>
              <tr>
                <th scope="col">{t('col.held')}</th>
                <th scope="col" className="num">
                  {t('charts.wallets')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td className="num">{d.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
