import { USDC_MINT, WSOL_MINT, type Trade } from './types.ts';

/** The parts of a `getTransaction` (jsonParsed) response the parser reads. */
export interface ParsedTx {
  slot: number;
  blockTime: number | null;
  meta: {
    err: unknown;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  } | null;
  transaction: {
    signatures: string[];
    message: { accountKeys: { pubkey: string; signer: boolean }[] };
  };
}

export interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { uiAmount: number | null; uiAmountString?: string; decimals: number; amount: string };
}

/** Rent-exempt minimum of a token account, in lamports. Paid once when a wallet first holds a coin. */
const TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280;

const amountOf = (b: TokenBalance): number => {
  const s = b.uiTokenAmount.uiAmountString;
  if (s !== undefined) return Number(s) || 0;
  return b.uiTokenAmount.uiAmount ?? 0;
};

/**
 * Derives the fee payer's trades from a transaction's balance changes.
 * Works for the pump.fun bonding curve, PumpSwap, Raydium and aggregator routes alike,
 * because it reads what the wallet gave and received rather than the program's instructions.
 */
export function parseTrades(tx: ParsedTx, filterMint?: string): Trade[] {
  const meta = tx.meta;
  if (!meta || meta.err) return [];
  const keys = tx.transaction.message.accountKeys;
  const signerIndex = keys.findIndex((k) => k.signer);
  if (signerIndex < 0) return [];
  const signer = keys[signerIndex].pubkey;

  const lamportsDelta = (meta.postBalances[signerIndex] ?? 0) - (meta.preBalances[signerIndex] ?? 0) + meta.fee;

  const pre = new Map<string, number>();
  const post = new Map<string, number>();
  const preAccounts = new Set<number>();
  for (const b of meta.preTokenBalances ?? []) {
    if (b.owner !== signer) continue;
    pre.set(b.mint, (pre.get(b.mint) ?? 0) + amountOf(b));
    preAccounts.add(b.accountIndex);
  }
  let created = 0;
  for (const b of meta.postTokenBalances ?? []) {
    if (b.owner !== signer) continue;
    post.set(b.mint, (post.get(b.mint) ?? 0) + amountOf(b));
    if (!preAccounts.has(b.accountIndex)) created += 1;
  }

  const delta = (mint: string) => (post.get(mint) ?? 0) - (pre.get(mint) ?? 0);
  const wsolDelta = delta(WSOL_MINT);
  const usdcDelta = delta(USDC_MINT);
  const solFlow = lamportsDelta / 1e9 + wsolDelta + (created * TOKEN_ACCOUNT_RENT_LAMPORTS) / 1e9;

  const mints = new Set<string>([...pre.keys(), ...post.keys()]);
  mints.delete(WSOL_MINT);
  mints.delete(USDC_MINT);
  const changed = [...mints].filter((m) => Math.abs(delta(m)) > 0);
  if (changed.length !== 1) return [];
  const mint = changed[0];
  if (filterMint && mint !== filterMint) return [];

  const tokens = delta(mint);
  const time = tx.blockTime ?? Math.floor(Date.now() / 1000);
  const base = {
    signature: tx.transaction.signatures[0],
    slot: tx.slot,
    time,
    wallet: signer,
    mint,
    remaining: post.get(mint) ?? 0,
  };

  if (tokens > 0) {
    if (usdcDelta < -0.01) return [{ ...base, side: 'buy', tokens, quote: 'USDC', quoteAmount: -usdcDelta }];
    if (solFlow < -0.000_001) return [{ ...base, side: 'buy', tokens, quote: 'SOL', quoteAmount: -solFlow }];
    return []; // tokens arrived without payment: a transfer or airdrop, not a purchase
  }
  if (usdcDelta > 0.01) return [{ ...base, side: 'sell', tokens: -tokens, quote: 'USDC', quoteAmount: usdcDelta }];
  if (solFlow > 0.000_001) return [{ ...base, side: 'sell', tokens: -tokens, quote: 'SOL', quoteAmount: solFlow }];
  return []; // tokens left without proceeds: a transfer out or a burn
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isSolanaAddress = (s: string): boolean => BASE58.test(s.trim());
