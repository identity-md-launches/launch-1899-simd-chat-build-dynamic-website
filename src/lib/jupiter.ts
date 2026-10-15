import { WSOL_MINT, type CoinInfo } from './types.ts';

const TOKENS = 'https://lite-api.jup.ag/tokens/v2';
const PRICE = 'https://lite-api.jup.ag/price/v3';

interface JupToken {
  id: string;
  name: string;
  symbol: string;
  icon?: string;
  decimals: number;
  launchpad?: string;
  mcap?: number;
  fdv?: number;
  usdPrice?: number;
  createdAt?: string;
  stats5m?: { numBuys?: number };
  stats1h?: { numBuys?: number };
}

async function getJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Jupiter ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

const toCoin = (t: JupToken): CoinInfo => ({
  mint: t.id,
  name: t.name,
  symbol: t.symbol,
  icon: t.icon,
  launchpad: t.launchpad,
  mcap: t.mcap ?? t.fdv,
  usdPrice: t.usdPrice,
  decimals: t.decimals,
  createdAt: t.createdAt,
  buys5m: t.stats5m?.numBuys ?? 0,
  buys1h: t.stats1h?.numBuys ?? 0,
});

/**
 * Coins launched on pump.fun or another launchpad, merged from Jupiter's newest, trending and
 * most traded lists. Only tokens that Jupiter attributes to a launchpad are kept.
 */
export async function fetchLaunchpadCoins(): Promise<CoinInfo[]> {
  const lists = await Promise.allSettled([
    getJson<JupToken[]>(`${TOKENS}/recent`),
    getJson<JupToken[]>(`${TOKENS}/toptrending/1h`),
    getJson<JupToken[]>(`${TOKENS}/toptraded/1h`),
  ]);
  const byMint = new Map<string, CoinInfo>();
  let ok = 0;
  for (const r of lists) {
    if (r.status !== 'fulfilled') continue;
    ok += 1;
    for (const t of r.value) {
      if (!t.launchpad) continue;
      const coin = toCoin(t);
      const prev = byMint.get(coin.mint);
      byMint.set(coin.mint, prev ? { ...prev, ...coin, buys5m: Math.max(prev.buys5m ?? 0, coin.buys5m ?? 0) } : coin);
    }
  }
  if (ok === 0) throw new Error('Jupiter token lists unavailable');
  return [...byMint.values()];
}

/** USD prices for up to any number of mints, fetched in chunks of 50. */
export async function fetchPrices(mints: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(mints)];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const data = await getJson<Record<string, { usdPrice?: number } | null>>(`${PRICE}?ids=${chunk.join(',')}`);
    for (const [mint, v] of Object.entries(data)) {
      if (v && typeof v.usdPrice === 'number') out.set(mint, v.usdPrice);
    }
  }
  return out;
}

export async function fetchSolPrice(): Promise<number | null> {
  const prices = await fetchPrices([WSOL_MINT]);
  return prices.get(WSOL_MINT) ?? null;
}

/** Name, symbol, launchpad and market cap for specific mints. */
export async function fetchTokenInfo(mints: string[]): Promise<Map<string, CoinInfo>> {
  const out = new Map<string, CoinInfo>();
  const unique = [...new Set(mints)];
  for (let i = 0; i < unique.length; i += 20) {
    const chunk = unique.slice(i, i + 20);
    const data = await getJson<JupToken[]>(`${TOKENS}/search?query=${chunk.join(',')}`);
    for (const t of data) out.set(t.id, toCoin(t));
  }
  return out;
}

/** pump.fun and letsbonk mints carry a vanity suffix, which identifies them without a lookup. */
export const looksLikeLaunchpadMint = (mint: string) => /pump$|bonk$/i.test(mint);
