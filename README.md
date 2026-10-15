# Pump Wallet Watch

A static website that tracks Solana wallets buying and selling memecoins launched on pump.fun and other launchpads. Everything runs in the visitor's browser against public APIs: trades are read from the Solana blockchain through a JSON-RPC node, and coin lists, launchpad labels, market caps and prices come from Jupiter's token and price APIs. There is no backend, no API key and no wallet connection.

Pages (hash routes, so the export works on any static host or IPFS gateway):

- `#/` dashboard: filters (purchase range, market cap range, wallets to track, refresh interval), a form to add a wallet of your own, a live status line, the list of tracked wallets still holding, the list of wallets that sold, stat tiles, two charts and the data-source panel with an editable RPC URL.
- `#/wallet/<address>` wallet details: positions, spent and received totals, profit or loss, average hold, a per-coin chart and watchlist controls.
- `#/faq` questions, including how to read the profit or loss and holding time figures.

Languages: English (default), Spanish, French, German, Portuguese and Chinese, switchable from the header; the choice is kept in the browser.

## How it works

Each scan (every 45 seconds by default):

1. Reads the SOL price and Jupiter's newest, trending and most traded token lists, keeps tokens with a `launchpad` label (pump.fun, letsbonk and others) and filters them by the market cap range.
2. Reads the newest transactions of the most active coins in range (and of every coin with an open tracked position) from the RPC node and turns each one into a buy or sell by comparing the wallet's token and SOL balances before and after (`src/lib/trades.ts`). This works for the pump.fun bonding curve, PumpSwap, Raydium and aggregator routes alike.
3. Adds wallets whose purchase is inside the purchase range (50 to 500 USD by default) until the list is full, removes a wallet from the holding list when it sells, moves it to the sold list with sale price, profit or loss and holding time, and fills the freed place with the next qualifying wallet (`src/engine/tracker.ts`, `src/lib/positions.ts`).
4. Reads the recent transactions of wallets added by hand and refreshes current prices for open positions.

State (filters, watchlist, positions, processed signatures) is kept in `localStorage`.

Default RPC: `https://solana-rpc.publicnode.com` (public, CORS-enabled, one `getTransaction` per request). `https://api.mainnet-beta.solana.com` refused requests from this build machine with 403, and pump.fun's own frontend API sits behind a Cloudflare challenge, so neither is used. Any Solana mainnet RPC URL can be set in the data-sources panel.

## Install, preview, rebuild

Requires Node 20 or newer.

```sh
npm install          # installs React, Vite and TypeScript
npm run dev          # development server with hot reload
npm run build        # production export to dist/ with relative asset URLs (base './')
npm run preview      # serves dist/ locally
npm run typecheck    # tsc --noEmit
npm test             # unit tests for the trade parser and position math (node --test)
```

The committed `dist/` is the deliverable; rebuild it after any source change. `public/og.png` is the share image (rendered once from a small HTML template with Playwright) and `public/favicon.svg` the icon.

## Project layout

- `src/lib/` pure modules: `trades.ts` (transaction to trade), `positions.ts` (cost basis, profit or loss, holding time, aggregates), `rpc.ts` (JSON-RPC client with concurrency limit and retries), `jupiter.ts` (coin lists, prices, token lookups), `format.ts`, `storage.ts`, `types.ts`.
- `src/engine/` the `Tracker` store, its React hooks and `useMediaQuery`.
- `src/components/`, `src/pages/`, `src/App.tsx` (hash router), `src/i18n/` (strings).
- `src/styles.css` tokens and all styling; documented in `DESIGN.md`.
- `test/unit/` node tests, `test/fixtures/` three real mainnet transactions (a creator-fee sweep, a Jupiter-routed buy, a router sell) trimmed to the fields the parser reads.

## Validation

Run on the build machine on 2026-10-16 against the committed export. Full record with coverage, findings and limitations: `docs/validation.md` (same content as `artifacts/validation.md`).

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | passes, no errors |
| Production build | `npm run build` | `dist/index.html`, one JS chunk (314 kB, 99 kB gzip), one CSS file, favicon and og image; all URLs relative |
| Unit tests | `npm test` | 9 of 9 pass (parser on real transactions, position math, aggregates) |
| Design probe taste@1 | `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | 16 of 16 checks pass after fixes (first run 14 of 16: column overlap at 1440 and a nav pill read as a kicker; both fixed) |
| Browser walkthrough | own Playwright script serving `dist/` under a subpath (Chromium 390x844 mobile emulation and 1440x900, WebKit 390x844) | 35 of 37 steps pass: load, title, first screen (panels and live list heading visible), no horizontal scroll, filter validation and focus, persisted filters, invalid and valid wallet add, first live scan, wallet page, back, FAQ, Spanish, skip link, no page errors. The two misses: Chromium logs blocked requests for coin icons whose hosts forbid cross-origin embedding (the site hides those images), and WebKit cannot launch on this machine (missing `libgtk-4` and `libgraphene`) |
| Live data | first scans during the runs | the tracker found and listed real purchases with live prices within seconds (1 wallet at 390, 3 at 1440, 19 to 47 coins in the default market cap range) |

Limitations: Safari rendering unverified (WebKit would not launch here); no screen-reader session, no physical device, no browser-native 200% zoom test; widths between 640 and 1024 were not inspected; the live lists depend on current on-chain activity and on public RPC rate limits, so a fresh visit can show an empty list for the first scan or two.
