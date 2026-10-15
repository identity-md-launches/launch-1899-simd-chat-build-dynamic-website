export type Side = 'buy' | 'sell';
export type Quote = 'SOL' | 'USDC';

/** One trade of one wallet in one transaction, derived from token balance changes. */
export interface Trade {
  signature: string;
  slot: number;
  /** Unix seconds. */
  time: number;
  wallet: string;
  mint: string;
  side: Side;
  /** Token amount traded, in whole tokens. */
  tokens: number;
  quote: Quote;
  /** Amount of SOL or USDC the wallet paid (buy) or received (sell), fees included. */
  quoteAmount: number;
  /** Wallet's token balance after the transaction. */
  remaining: number;
}

export interface CoinInfo {
  mint: string;
  name: string;
  symbol: string;
  icon?: string;
  launchpad?: string;
  mcap?: number;
  usdPrice?: number;
  decimals: number;
  createdAt?: string;
  buys5m?: number;
  buys1h?: number;
}

export type PositionSource = 'auto' | 'manual';
export type PositionStatus = 'open' | 'sold';

export interface Position {
  id: string;
  wallet: string;
  mint: string;
  source: PositionSource;
  status: PositionStatus;
  symbol: string;
  name: string;
  icon?: string;
  launchpad?: string;
  /** Unix seconds. */
  firstBuyAt: number;
  lastBuyAt: number;
  soldAt?: number;
  buySignatures: string[];
  sellSignatures: string[];
  tokensBought: number;
  tokensSold: number;
  tokensHeld: number;
  costUsd: number;
  proceedsUsd: number;
  costSol: number;
  proceedsSol: number;
  /** Average cost per token in USD. */
  buyPriceUsd: number;
  /** Average sale price per token in USD, once something was sold. */
  sellPriceUsd?: number;
  currentPriceUsd?: number;
  priceUpdatedAt?: number;
  mcapAtBuy?: number;
}

export interface Settings {
  minBuyUsd: number;
  maxBuyUsd: number;
  minMcapUsd: number;
  /** null means no upper limit. */
  maxMcapUsd: number | null;
  maxTracked: number;
  refreshSeconds: number;
  coinsPerScan: number;
  rpcUrl: string;
}

export const DEFAULT_RPC_URL = 'https://solana-rpc.publicnode.com';

export const DEFAULT_SETTINGS: Settings = {
  minBuyUsd: 50,
  maxBuyUsd: 500,
  minMcapUsd: 5_000,
  maxMcapUsd: 1_000_000,
  maxTracked: 20,
  refreshSeconds: 45,
  coinsPerScan: 5,
  rpcUrl: DEFAULT_RPC_URL,
};

export const WSOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
