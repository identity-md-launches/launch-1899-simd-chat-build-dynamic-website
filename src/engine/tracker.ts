import { fetchLaunchpadCoins, fetchPrices, fetchSolPrice, fetchTokenInfo, looksLikeLaunchpadMint } from '../lib/jupiter.ts';
import { addBuy, addSell, openPosition } from '../lib/positions.ts';
import { RpcClient } from '../lib/rpc.ts';
import { load, save } from '../lib/storage.ts';
import { parseTrades } from '../lib/trades.ts';
import { DEFAULT_SETTINGS, type CoinInfo, type Position, type Settings, type Trade } from '../lib/types.ts';

export type ErrorKind = 'rpc' | 'coins' | 'prices' | null;

export interface TrackerState {
  settings: Settings;
  positions: Position[];
  manualWallets: string[];
  coins: CoinInfo[];
  watchedMints: string[];
  solPrice: number | null;
  lastScanAt: number | null;
  nextScanAt: number | null;
  scanning: boolean;
  paused: boolean;
  error: ErrorKind;
  errorDetail: string | null;
  rpcCalls: number;
  tradesSeen: number;
  /** Set while a wallet added by hand is being read for the first time. */
  loadingWallet: string | null;
}

const SIGNATURES_PER_ADDRESS = 12;
const MAX_SOLD_KEPT = 60;
const MAX_SEEN = 4000;

type Listener = () => void;

/**
 * Finds wallets buying launchpad memecoins, follows them until they sell, and keeps the list full.
 * All data comes from the browser: a Solana RPC node for transactions and Jupiter for coins and prices.
 */
export class Tracker {
  private state: TrackerState;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private rpc: RpcClient;
  private lastSignature: Record<string, string>;
  private seen: string[];
  private seenSet: Set<string>;
  private coinCache = new Map<string, CoinInfo>();

  constructor() {
    const settings = { ...DEFAULT_SETTINGS, ...load<Partial<Settings>>('settings', {}) };
    this.state = {
      settings,
      positions: load<Position[]>('positions', []),
      manualWallets: load<string[]>('manualWallets', []),
      coins: [],
      watchedMints: [],
      solPrice: null,
      lastScanAt: null,
      nextScanAt: null,
      scanning: false,
      paused: false,
      error: null,
      errorDetail: null,
      rpcCalls: 0,
      tradesSeen: 0,
      loadingWallet: null,
    };
    this.lastSignature = load<Record<string, string>>('lastSignature', {});
    this.seen = load<string[]>('seen', []);
    this.seenSet = new Set(this.seen);
    this.rpc = new RpcClient(settings.rpcUrl);
  }

  getState = (): TrackerState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<TrackerState>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  private persist(): void {
    const open = this.state.positions.filter((p) => p.status === 'open');
    const sold = this.state.positions.filter((p) => p.status === 'sold').slice(-MAX_SOLD_KEPT);
    save('positions', [...open, ...sold]);
    save('manualWallets', this.state.manualWallets);
    save('lastSignature', this.lastSignature);
    save('seen', this.seen.slice(-MAX_SEEN));
  }

  start(): void {
    if (this.timer) return;
    void this.scan();
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  setPaused(paused: boolean): void {
    this.set({ paused });
    if (paused) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      this.set({ nextScanAt: null });
    } else {
      this.schedule(0);
    }
  }

  refreshNow(): void {
    if (this.state.scanning) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    void this.scan();
  }

  updateSettings(patch: Partial<Settings>): void {
    const settings = { ...this.state.settings, ...patch };
    save('settings', settings);
    if (settings.rpcUrl !== this.rpc.url) this.rpc = new RpcClient(settings.rpcUrl);
    this.set({ settings });
    if (!this.state.paused) this.refreshNow();
  }

  async addWallet(address: string): Promise<void> {
    const wallet = address.trim();
    if (this.state.manualWallets.includes(wallet)) return;
    this.set({ manualWallets: [...this.state.manualWallets, wallet], loadingWallet: wallet });
    this.persist();
    try {
      if (this.state.solPrice === null) this.set({ solPrice: await fetchSolPrice() });
      await this.scanWallet(wallet);
      await this.refreshPrices();
      this.set({ error: null, errorDetail: null });
    } catch (e) {
      this.set({ error: 'rpc', errorDetail: errorText(e) });
    } finally {
      this.set({ loadingWallet: null, rpcCalls: this.rpc.calls });
      this.persist();
    }
  }

  removeWallet(wallet: string): void {
    this.set({
      manualWallets: this.state.manualWallets.filter((w) => w !== wallet),
      positions: this.state.positions.filter((p) => p.wallet !== wallet),
    });
    delete this.lastSignature[wallet];
    this.persist();
  }

  removePosition(id: string): void {
    this.set({ positions: this.state.positions.filter((p) => p.id !== id) });
    this.persist();
  }

  private schedule(ms: number): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.scan();
    }, ms);
    this.set({ nextScanAt: Date.now() + ms });
  }

  private async scan(): Promise<void> {
    if (this.state.scanning) return;
    this.set({ scanning: true, nextScanAt: null });
    let error: ErrorKind = null;
    let errorDetail: string | null = null;
    try {
      const sol = await fetchSolPrice().catch(() => null);
      if (sol !== null) this.set({ solPrice: sol });
      if (this.state.solPrice === null) throw new PriceError('SOL price unavailable');

      let candidates: CoinInfo[] = [];
      try {
        const coins = await fetchLaunchpadCoins();
        for (const c of coins) this.coinCache.set(c.mint, c);
        candidates = coins.filter((c) => this.inMcapRange(c)).sort((a, b) => (b.buys5m ?? 0) - (a.buys5m ?? 0) || (b.buys1h ?? 0) - (a.buys1h ?? 0));
        this.set({ coins: candidates });
      } catch (e) {
        error = 'coins';
        errorDetail = errorText(e);
      }

      const openAutoMints = this.state.positions.filter((p) => p.status === 'open' && p.source === 'auto').map((p) => p.mint);
      const mints = [...new Set([...candidates.slice(0, this.state.settings.coinsPerScan).map((c) => c.mint), ...openAutoMints])];
      this.set({ watchedMints: mints });
      try {
        for (const mint of mints) await this.scanMint(mint);
        for (const wallet of this.state.manualWallets) await this.scanWallet(wallet);
      } catch (e) {
        error = 'rpc';
        errorDetail = errorText(e);
      }
      try {
        await this.refreshPrices();
      } catch (e) {
        if (!error) {
          error = 'prices';
          errorDetail = errorText(e);
        }
      }
    } catch (e) {
      error = e instanceof PriceError ? 'prices' : 'rpc';
      errorDetail = errorText(e);
    } finally {
      this.persist();
      this.set({ scanning: false, lastScanAt: Date.now(), error, errorDetail, rpcCalls: this.rpc.calls });
      if (!this.state.paused) this.schedule(this.state.settings.refreshSeconds * 1000);
    }
  }

  private inMcapRange(c: CoinInfo): boolean {
    const { minMcapUsd, maxMcapUsd } = this.state.settings;
    const mcap = c.mcap ?? 0;
    return mcap >= minMcapUsd && (maxMcapUsd === null || mcap <= maxMcapUsd);
  }

  /** Newest transactions of an address, oldest first, skipping those already processed. */
  private async freshTrades(address: string, filterMint?: string): Promise<Trade[]> {
    const sigs = await this.rpc.getSignatures(address, { limit: SIGNATURES_PER_ADDRESS, until: this.lastSignature[address] });
    if (sigs.length) this.lastSignature[address] = sigs[0].signature;
    const fresh = sigs.filter((s) => !s.err && !this.seenSet.has(s.signature)).reverse();
    const txs = await Promise.all(fresh.map((s) => this.rpc.getTransaction(s.signature).catch(() => null)));
    const trades: Trade[] = [];
    txs.forEach((tx, i) => {
      this.markSeen(fresh[i].signature);
      if (tx) trades.push(...parseTrades(tx, filterMint));
    });
    if (trades.length) this.set({ tradesSeen: this.state.tradesSeen + trades.length });
    return trades;
  }

  private markSeen(signature: string): void {
    if (this.seenSet.has(signature)) return;
    this.seenSet.add(signature);
    this.seen.push(signature);
    if (this.seen.length > MAX_SEEN) {
      const dropped = this.seen.splice(0, this.seen.length - MAX_SEEN);
      for (const d of dropped) this.seenSet.delete(d);
    }
  }

  private async scanMint(mint: string): Promise<void> {
    const trades = await this.freshTrades(mint, mint);
    for (const t of trades) this.applyTrade(t, this.coinCache.get(mint));
  }

  private async scanWallet(wallet: string): Promise<void> {
    const trades = (await this.freshTrades(wallet)).filter((t) => t.wallet === wallet);
    const unknown = [...new Set(trades.map((t) => t.mint))].filter((m) => !this.coinCache.has(m));
    if (unknown.length) {
      const info = await fetchTokenInfo(unknown).catch(() => new Map<string, CoinInfo>());
      for (const [m, c] of info) this.coinCache.set(m, c);
    }
    for (const t of trades) {
      const coin = this.coinCache.get(t.mint);
      const isLaunchpadCoin = Boolean(coin?.launchpad) || looksLikeLaunchpadMint(t.mint);
      if (!isLaunchpadCoin) continue;
      this.applyTrade(t, coin);
    }
  }

  private applyTrade(t: Trade, coin?: CoinInfo): void {
    const solPrice = this.state.solPrice ?? 0;
    const usd = t.quote === 'SOL' ? t.quoteAmount * solPrice : t.quoteAmount;
    const positions = this.state.positions;
    const index = positions.findIndex((p) => p.status === 'open' && p.wallet === t.wallet && p.mint === t.mint);
    const open = index >= 0 ? positions[index] : null;
    const isManual = this.state.manualWallets.includes(t.wallet);

    if (t.side === 'buy') {
      if (open) {
        this.replace(index, addBuy(open, t, usd));
        return;
      }
      const { minBuyUsd, maxBuyUsd, maxTracked } = this.state.settings;
      const openAuto = positions.filter((p) => p.status === 'open' && p.source === 'auto').length;
      const qualifies = usd >= minBuyUsd && usd <= maxBuyUsd && Boolean(coin) && this.inMcapRange(coin as CoinInfo) && openAuto < maxTracked;
      if (!isManual && !qualifies) return;
      const alreadySold = positions.some((p) => p.status === 'sold' && p.buySignatures.includes(t.signature));
      if (alreadySold) return;
      this.set({ positions: [...positions, openPosition(t, usd, isManual ? 'manual' : 'auto', coin)] });
      return;
    }
    if (open) this.replace(index, addSell(open, t, usd));
  }

  private replace(index: number, p: Position): void {
    const positions = this.state.positions.slice();
    positions[index] = p;
    this.set({ positions });
  }

  private async refreshPrices(): Promise<void> {
    const open = this.state.positions.filter((p) => p.status === 'open');
    if (!open.length) return;
    const prices = await fetchPrices(open.map((p) => p.mint));
    const now = Date.now();
    this.set({
      positions: this.state.positions.map((p) => {
        if (p.status !== 'open') return p;
        const price = prices.get(p.mint);
        return price === undefined ? p : { ...p, currentPriceUsd: price, priceUpdatedAt: now };
      }),
    });
  }
}

class PriceError extends Error {}

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const tracker = new Tracker();
