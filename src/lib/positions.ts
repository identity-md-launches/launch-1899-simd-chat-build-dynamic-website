import type { CoinInfo, Position, PositionSource, Trade } from './types.ts';

/** Below this share of the tokens bought, what is left counts as dust and the position is sold. */
const DUST_SHARE = 0.005;

export function openPosition(trade: Trade, usd: number, source: PositionSource, coin?: Partial<CoinInfo>): Position {
  const sol = trade.quote === 'SOL' ? trade.quoteAmount : 0;
  return {
    id: `${trade.wallet}:${trade.mint}:${trade.signature.slice(0, 12)}`,
    wallet: trade.wallet,
    mint: trade.mint,
    source,
    status: 'open',
    symbol: coin?.symbol ?? shortMint(trade.mint),
    name: coin?.name ?? '',
    icon: coin?.icon,
    launchpad: coin?.launchpad,
    firstBuyAt: trade.time,
    lastBuyAt: trade.time,
    buySignatures: [trade.signature],
    sellSignatures: [],
    tokensBought: trade.tokens,
    tokensSold: 0,
    tokensHeld: trade.remaining > 0 ? trade.remaining : trade.tokens,
    costUsd: usd,
    proceedsUsd: 0,
    costSol: sol,
    proceedsSol: 0,
    buyPriceUsd: trade.tokens > 0 ? usd / trade.tokens : 0,
    currentPriceUsd: coin?.usdPrice,
    mcapAtBuy: coin?.mcap,
  };
}

export function addBuy(p: Position, trade: Trade, usd: number): Position {
  const sol = trade.quote === 'SOL' ? trade.quoteAmount : 0;
  const tokensBought = p.tokensBought + trade.tokens;
  const costUsd = p.costUsd + usd;
  return {
    ...p,
    lastBuyAt: Math.max(p.lastBuyAt, trade.time),
    buySignatures: [...p.buySignatures, trade.signature],
    tokensBought,
    tokensHeld: trade.remaining > 0 ? trade.remaining : p.tokensHeld + trade.tokens,
    costUsd,
    costSol: p.costSol + sol,
    buyPriceUsd: tokensBought > 0 ? costUsd / tokensBought : 0,
  };
}

export function addSell(p: Position, trade: Trade, usd: number): Position {
  const sol = trade.quote === 'SOL' ? trade.quoteAmount : 0;
  const tokensSold = p.tokensSold + trade.tokens;
  const proceedsUsd = p.proceedsUsd + usd;
  const tokensHeld = Math.max(0, trade.remaining);
  const sold = tokensHeld <= p.tokensBought * DUST_SHARE;
  return {
    ...p,
    sellSignatures: [...p.sellSignatures, trade.signature],
    tokensSold,
    tokensHeld,
    proceedsUsd,
    proceedsSol: p.proceedsSol + sol,
    sellPriceUsd: tokensSold > 0 ? proceedsUsd / tokensSold : undefined,
    status: sold ? 'sold' : 'open',
    soldAt: sold ? trade.time : undefined,
  };
}

/** Profit or loss in USD: what came back plus what is still held, minus what was paid. */
export function profitLoss(p: Position): { usd: number; priceKnown: boolean } {
  if (p.status === 'sold') return { usd: p.proceedsUsd - p.costUsd, priceKnown: true };
  const priceKnown = p.currentPriceUsd !== undefined && p.currentPriceUsd > 0;
  const heldValue = priceKnown ? p.tokensHeld * (p.currentPriceUsd as number) : 0;
  return { usd: p.proceedsUsd + heldValue - p.costUsd, priceKnown };
}

/** Holding time in seconds: buy to sale, or buy to now while the wallet still holds. */
export function holdSeconds(p: Position, nowSeconds: number): number {
  const end = p.status === 'sold' && p.soldAt ? p.soldAt : nowSeconds;
  return Math.max(0, end - p.firstBuyAt);
}

export interface Aggregates {
  open: number;
  sold: number;
  avgHoldOpen: number | null;
  avgHoldSold: number | null;
  avgPnlOpen: number | null;
  avgPnlSold: number | null;
  winRate: number | null;
}

export function aggregate(positions: Position[], nowSeconds: number): Aggregates {
  const open = positions.filter((p) => p.status === 'open');
  const sold = positions.filter((p) => p.status === 'sold');
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const pricedOpen = open.filter((p) => profitLoss(p).priceKnown);
  const wins = sold.filter((p) => profitLoss(p).usd > 0).length;
  return {
    open: open.length,
    sold: sold.length,
    avgHoldOpen: avg(open.map((p) => holdSeconds(p, nowSeconds))),
    avgHoldSold: avg(sold.map((p) => holdSeconds(p, nowSeconds))),
    avgPnlOpen: avg(pricedOpen.map((p) => profitLoss(p).usd)),
    avgPnlSold: avg(sold.map((p) => profitLoss(p).usd)),
    winRate: sold.length ? wins / sold.length : null,
  };
}

export const shortMint = (mint: string) => `${mint.slice(0, 4)}…${mint.slice(-4)}`;
export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
