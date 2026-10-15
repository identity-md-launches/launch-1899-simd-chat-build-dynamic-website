import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { addBuy, addSell, aggregate, holdSeconds, openPosition, profitLoss } from '../../src/lib/positions.ts';
import { isSolanaAddress, parseTrades, type ParsedTx } from '../../src/lib/trades.ts';
import type { Trade } from '../../src/lib/types.ts';

const MINT = 'Bd25EMXkYWpZjAvjpLiVhTpFyZkMLXbbeyKjVAhGpump';
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/pump-trades.json', import.meta.url), 'utf8')) as ParsedTx[];

test('a creator fee sweep with no token movement is not a trade', () => {
  assert.deepEqual(parseTrades(fixtures[0], MINT), []);
});

test('a Jupiter-routed purchase on the pump.fun bonding curve is a SOL buy', () => {
  const [t] = parseTrades(fixtures[1], MINT);
  assert.ok(t);
  assert.equal(t.side, 'buy');
  assert.equal(t.mint, MINT);
  assert.equal(t.quote, 'SOL');
  assert.ok(t.quoteAmount > 1.0 && t.quoteAmount < 1.02, `paid ${t.quoteAmount} SOL`);
  assert.ok(t.tokens > 33_000_000 && t.tokens < 33_100_000);
  assert.ok(t.remaining >= t.tokens);
});

test('a sale through a router is a SOL sell with the remaining balance', () => {
  const [t] = parseTrades(fixtures[2], MINT);
  assert.ok(t);
  assert.equal(t.side, 'sell');
  assert.ok(t.quoteAmount > 0.119 && t.quoteAmount < 0.121, `received ${t.quoteAmount} SOL`);
  assert.ok(t.tokens > 4_230_000 && t.tokens < 4_231_000);
  assert.equal(t.remaining, 0);
});

test('a mint filter drops trades of other coins', () => {
  assert.deepEqual(parseTrades(fixtures[1], 'So11111111111111111111111111111111111111112'), []);
});

test('failed transactions are ignored', () => {
  const failed = { ...fixtures[1], meta: { ...fixtures[1].meta!, err: { InstructionError: [0, 'Custom'] } } } as ParsedTx;
  assert.deepEqual(parseTrades(failed, MINT), []);
});

test('address validation accepts base58 keys and rejects junk', () => {
  assert.equal(isSolanaAddress('7Zq3PV5WE5iKPTy85h17tSuUL2jBSJKVUL7zyvx5F9L8'), true);
  assert.equal(isSolanaAddress('0x1234'), false);
  assert.equal(isSolanaAddress('not an address'), false);
});

const buy: Trade = { signature: 'sig-buy', slot: 1, time: 1_000, wallet: 'W', mint: 'M', side: 'buy', tokens: 1000, quote: 'SOL', quoteAmount: 1, remaining: 1000 };

test('a position tracks cost, sale, profit and holding time', () => {
  let p = openPosition(buy, 100, 'auto', { symbol: 'TEST', name: 'Test coin', mcap: 20_000, usdPrice: 0.1 });
  assert.equal(p.status, 'open');
  assert.equal(p.buyPriceUsd, 0.1);
  p = addBuy(p, { ...buy, signature: 'sig-buy-2', time: 1_100, tokens: 1000, remaining: 2000 }, 300);
  assert.equal(p.tokensBought, 2000);
  assert.equal(p.buyPriceUsd, 0.2);
  assert.equal(holdSeconds(p, 1_600), 600);
  p = { ...p, currentPriceUsd: 0.3 };
  assert.equal(profitLoss(p).usd, 200);
  p = addSell(p, { ...buy, signature: 'sig-sell', time: 2_000, side: 'sell', tokens: 1500, remaining: 500 }, 450);
  assert.equal(p.status, 'open', 'a partial sale keeps the position open');
  p = addSell(p, { ...buy, signature: 'sig-sell-2', time: 2_500, side: 'sell', tokens: 500, remaining: 0 }, 100);
  assert.equal(p.status, 'sold');
  assert.equal(p.soldAt, 2_500);
  assert.equal(p.sellPriceUsd, 0.275);
  assert.equal(profitLoss(p).usd, 150);
  assert.equal(holdSeconds(p, 9_999), 1_500);
});

test('dust left after a sale still counts as sold', () => {
  const p = openPosition(buy, 100, 'auto');
  const sold = addSell(p, { ...buy, side: 'sell', tokens: 999, remaining: 1 }, 120);
  assert.equal(sold.status, 'sold');
});

test('aggregates average holding time and profit across wallets', () => {
  const a = { ...openPosition(buy, 100, 'auto'), currentPriceUsd: 0.2 };
  const b = addSell(openPosition({ ...buy, wallet: 'X', time: 500 }, 100, 'auto'), { ...buy, wallet: 'X', side: 'sell', time: 800, tokens: 1000, remaining: 0 }, 50);
  const agg = aggregate([a, b], 1_300);
  assert.equal(agg.open, 1);
  assert.equal(agg.sold, 1);
  assert.equal(agg.avgHoldOpen, 300);
  assert.equal(agg.avgHoldSold, 300);
  assert.equal(agg.avgPnlOpen, 100);
  assert.equal(agg.avgPnlSold, -50);
  assert.equal(agg.winRate, 0);
});
