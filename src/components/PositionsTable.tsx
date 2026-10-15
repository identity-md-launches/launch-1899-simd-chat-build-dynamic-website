import { tracker } from '../engine/tracker.ts';
import { useI18n } from '../i18n/index.tsx';
import { formatAgo, formatDuration, formatPrice, formatUsd } from '../lib/format.ts';
import { holdSeconds, profitLoss, shortAddress } from '../lib/positions.ts';
import type { Position } from '../lib/types.ts';

export function PnlValue({ usd, priceKnown }: { usd: number; priceKnown: boolean }) {
  const { t, locale } = useI18n();
  const mark = !priceKnown ? '' : usd > 0 ? ' pnl__mark--gain' : usd < 0 ? ' pnl__mark--loss' : '';
  return (
    <span className="pnl num">
      <span className={`pnl__mark${mark}`} aria-hidden="true" />
      {priceKnown ? formatUsd(usd, locale, { sign: true }) : t('row.priceUnknown')}
    </span>
  );
}

export function CoinCell({ p }: { p: Position }) {
  return (
    <span className="coin">
      {p.icon && (
        <img
          src={p.icon}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.hidden = true; // some icon hosts block cross-origin embedding; the symbol still names the coin
          }}
        />
      )}
      <span>
        <span>{p.symbol}</span>
        {p.name && <span className="coin__name"> {p.name}</span>}
      </span>
    </span>
  );
}

interface Props {
  positions: Position[];
  now: number;
  mode: 'open' | 'sold';
  showWallet?: boolean;
}

export function PositionsTable({ positions, now, mode, showWallet = true }: Props) {
  const { t, locale } = useI18n();
  const sorted = positions.slice().sort((a, b) => (mode === 'open' ? b.firstBuyAt - a.firstBuyAt : (b.soldAt ?? 0) - (a.soldAt ?? 0)));
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {showWallet && <th scope="col">{t('col.wallet')}</th>}
            <th scope="col">{t('col.coin')}</th>
            <th scope="col">{t('col.bought')}</th>
            <th scope="col" className="num">
              {t('col.purchase')}
            </th>
            <th scope="col" className="num">
              {t('col.buyPrice')}
            </th>
            <th scope="col" className="num">
              {mode === 'open' ? t('col.now') : t('col.sellPrice')}
            </th>
            <th scope="col" className="num">
              {t('col.pnl')}
            </th>
            <th scope="col" className="num">
              {mode === 'open' ? t('col.holding') : t('col.held')}
            </th>
            <th scope="col">
              <span className="visually-hidden">{t('row.details')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const pnl = profitLoss(p);
            return (
              <tr key={p.id}>
                {showWallet && (
                  <td data-label={t('col.wallet')} className="cell--wide">
                    <a href={`#/wallet/${p.wallet}`} className="mono">
                      {shortAddress(p.wallet)}
                    </a>{' '}
                    <span className="tag">{p.source === 'manual' ? t('row.manual') : t('row.auto')}</span>
                  </td>
                )}
                <td data-label={t('col.coin')} className={showWallet ? undefined : 'cell--wide'}>
                  <CoinCell p={p} />
                </td>
                <td data-label={t('col.bought')} className="num">
                  {formatAgo(p.firstBuyAt, now, locale)}
                </td>
                <td data-label={t('col.purchase')} className="num">
                  {formatUsd(p.costUsd, locale)}
                </td>
                <td data-label={t('col.buyPrice')} className="num">
                  {formatPrice(p.buyPriceUsd, locale)}
                </td>
                <td data-label={mode === 'open' ? t('col.now') : t('col.sellPrice')} className="num">
                  {mode === 'open'
                    ? p.currentPriceUsd !== undefined
                      ? formatPrice(p.currentPriceUsd, locale)
                      : t('row.priceUnknown')
                    : p.sellPriceUsd !== undefined
                      ? formatPrice(p.sellPriceUsd, locale)
                      : t('row.priceUnknown')}
                </td>
                <td data-label={t('col.pnl')} className="num">
                  <PnlValue usd={pnl.usd} priceKnown={pnl.priceKnown} />
                  {mode === 'open' && p.tokensSold > 0 && <span className="tag"> {t('row.partial')}</span>}
                </td>
                <td data-label={mode === 'open' ? t('col.holding') : t('col.held')} className="num">
                  {formatDuration(holdSeconds(p, now), locale)}
                </td>
                <td className="cell--actions">
                  <span className="actions-row">
                    {showWallet && (
                      <a href={`#/wallet/${p.wallet}`} className="btn btn--small">
                        {t('row.details')}
                      </a>
                    )}
                    <button type="button" className="btn btn--small" onClick={() => tracker.removePosition(p.id)}>
                      {t('row.remove')}
                    </button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
