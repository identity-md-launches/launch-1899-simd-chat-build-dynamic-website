# Validation record: Pump Wallet Watch

Worker-side validation of the committed export, run on the build machine on 2026-10-16 (CEST). This is the worker's report, not an independent certification.

## 1. Scope and assumptions

- Pages reviewed: dashboard (`#/`), wallet details (`#/wallet/<address>`), FAQ (`#/faq`), the not-found route. Export at `dist/`, built with `vite build`, `base: './'`.
- Flows exercised: filter validation and apply, reset, add a wallet (invalid and valid), first live scan, navigation to a wallet page and back, FAQ, language switch, skip link, pause and refresh controls (source review only for pause and refresh).
- Inferred choices: light theme only; system fonts; hash routing; the two forms collapse into disclosure panels below 760px so the live list is on the first screen at 390; public node RPC `https://solana-rpc.publicnode.com` as default because `api.mainnet-beta.solana.com` answered 403 from this machine and pump.fun's frontend API is behind a Cloudflare challenge (both verified with curl); Jupiter's token API supplies the pump.fun and launchpad labels; USD values of SOL trades use the SOL price at scan time.
- Needs the requester: nothing. An owner-settable RPC URL is provided for higher rate limits.
- Exclusions: no wallet connection (not a dapp), no dark theme, no right-to-left locale.

## 2. Coverage (Better Interface, six domains)

| Domain | Status | Inspected | Not performed |
| --- | --- | --- | --- |
| Accessibility | Checked | Source: native controls, labels bound by `htmlFor`, `aria-invalid` + `aria-describedby`, `role="status"` and `role="alert"`, skip link, one `h1` per page, `main` landmark, `aria-current` nav, `:focus-visible` ring, reduced-motion guard on the only animation. Browser: skip link first in tab order, focus moves to the first invalid field, probe `targets` (23 of 23 controls at least 24px or spaced at 390), probe `motion` (no endless animation under reduced motion) | Screen-reader session; forced-colors mode; browser-native 200% zoom (narrow viewports only); automated axe-style audit |
| Layout | Checked | Probe `layout` at 320, 390, 1440 (no horizontal scroll, no overlaps, no clipped text, no floating controls over text); screenshots at 390 and 1440 viewed; walkthrough `scrollWidth` at 390 and 1440; stacked table rows below 760px seen at 390; logical properties in source | Widths between 640 and 1024; RTL mirror |
| Writing | Checked | Source review of every string in `src/i18n/en.ts`: verb-first buttons, sentence case, errors say the fix beside the field, empty states point forward, no fragments assembled around variables (templated strings with `{var}`); probe `slogans`, `glyphs`, `repetition`, `copy-budget` (19 prose words on the first screen at 390, 56 at 1440) | Native-speaker review of the five translations |
| Typography | Checked | Probe `type-sizes` (4 sizes in use, 5 with one-offs, per width), `type-faces` (system-ui and ui-monospace, weights 400 and 600), `tracking`, `casing`; inputs at 16px; tabular numbers on changing values; wrapping seen at 390 | Real device rendering of system fonts other than Linux |
| Colors | Checked | Probe `contrast`: all measured text at or above 4.5:1 (3:1 large) at 390 and 1440 on resolved solid backgrounds; tokens by role in `src/styles.css`; gain and loss only on marks, status dot paired with a label | Pairs over images (none exist); dark theme (none) |
| UI | Checked | Probe `chrome` (no border plus shadow, no cards inside cards, no gradient text); `transition` names its properties; `scale(0.96)` on press; hover only under `(hover: hover)`; loading, empty, error and partial states rendered in source and the empty and live states seen in the browser | Error notice state in the browser (the RPC answered during every run); 10% speed motion replay |

## 3. Findings and fixes

| # | Severity | Where | Evidence | Fix | Recheck |
| --- | --- | --- | --- | --- | --- |
| 1 | High | `src/styles.css` `.stack`, `.dashboard` | First probe run, `layout`: five text overlaps at 1440, e.g. the "Market cap up to (USD)" label over the "Wallets holding" tile; the 1440 screenshot showed the left column running under the aside because the table's min-content width widened the implicit grid track | `.stack` got `grid-template-columns: minmax(0, 1fr)` and both `.stack > *` and `.dashboard > *` got `min-inline-size: 0`; the table scrolls inside `.table-wrap` | Probe `layout` passes; 1440 screenshot shows two clean columns |
| 2 | High (first screen) | `src/components/FilterForm.tsx`, `AddWalletForm.tsx`, `src/styles.css` `details.panel` | First 390 screenshot: the live list heading was below the fold (the add-wallet form started at about 830px) | Both forms moved into `details.panel` elements, open from 760px and collapsed below, with the current ranges and watchlist count in the summary | Walkthrough: list heading at y 640 of 844 at 390; at 1440 at y 821 of 900 after finding 3 (6-column field grid) |
| 3 | Medium | `src/styles.css` `.site-nav a[aria-current='page']` | Probe `eyebrows`: the filled "Dashboard" pill sat within 40px above the h1 at 1440 | Active link uses a 2px inset underline and no fill; page top padding 24px to 32px | Probe `eyebrows` passes |
| 4 | Medium | `src/components/PositionsTable.tsx` `CoinCell` | Walkthrough at 1440: three or four `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` console errors from coin icon hosts that forbid cross-origin embedding | `onError` hides the image; the symbol and name still identify the coin | The browser still logs the blocked requests (they are the host's policy, not a site error); no broken-image glyph remains. Recorded as a limitation below |
| 5 | Low | `src/i18n/en.ts` `dash.lead` | Lead ran to three lines at 390 | Shortened to one sentence of twelve words | Two lines at 390 |
| 6 | Low | `src/styles.css` `.field-grid` | At 1440 the two-row filter grid pushed the list heading to exactly the 900px line | Six columns from 1200px | Heading at 821px |

No remaining blockers.

## 4. Verification

Commands run from the repository root, in this order after the last source change:

| Command | Outcome |
| --- | --- |
| `npm run typecheck` | exit 0, no errors |
| `npm test` | 9 pass, 0 fail (parser on three real mainnet transactions: creator-fee sweep ignored, Jupiter-routed buy of about 1.01 SOL, router sell of about 0.12 SOL; position math; dust rule; aggregates) |
| `npm run build` | `dist/index.html` 1.18 kB, `dist/assets/index-*.css` 11.19 kB, `dist/assets/index-*.js` 315.03 kB (98.95 kB gzip), `dist/favicon.svg`, `dist/og.png`; all URLs relative |
| `IMD_PLAYWRIGHT=$HOME/.imd-taste/node_modules/playwright/index.mjs node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | 16 of 16 pass (render, layout, targets, contrast, casing, tracking, eyebrows, type-sizes, type-faces, glyphs, slogans, repetition, copy-budget, chrome, motion, share). First run before fixes: 14 of 16 (layout, eyebrows failed). Screenshots `test/scratch/taste/shots/390.png`, `1440.png` and full-page variants were viewed |
| `node test/scratch/walk/walk.mjs` (own Playwright script: serves `dist/` under `/preview/`, Chromium 390x844 mobile emulation and 1440x900, WebKit 390x844) | 35 of 37 steps pass. Chromium 390: 19 of 19. Chromium 1440: 18 of 19 (console entries for blocked icon hosts). WebKit: could not launch, see limitations. Screenshots in `test/scratch/walk/` |

Live data observed during the runs (real chain state at the time): the first scan completed within seconds on the public node, the status line read "Live, Updated now, 19 coins in range, SOL $105.68" at 390 and "47 coins in range" at 1440, and the tracker listed 1 and 3 freshly found wallets respectively, with a wallet page rendering for the first listed wallet. The manually added wallet `9S9CT2GvxbvcsxXDGVYDHZjSpPB2QfYiDPnw1sbJSqxS` was stored on the watchlist and read without error; its recent transactions held no new launchpad trade at that moment, so no manual position appeared.

Interactions verified in the browser: filter validation (min above max shows "Enter a lower amount in the first field than in the second" and focuses the field), applying filters persists them, invalid address shows the inline error, valid address joins the watchlist, Details link opens the wallet page, Back to dashboard, FAQ, language switch to Spanish (document `lang` and headings change), skip link first in tab order, no page errors.

## 5. Completion

Complete for the stated scope, with these limitations:

- WebKit (Safari engine) did not launch: Playwright's WebKit needs `libgtk-4.so.1` and `libgraphene-1.0.so.0`, which this machine lacks and cannot install. Safari rendering is unverified; the CSS uses only widely supported features (grid, logical properties, `text-wrap`, `details`), and `text-wrap: pretty` degrades to normal wrapping where unsupported.
- No screen-reader session, no physical device, no forced-colors check, no browser-native 200% zoom test.
- Widths between 640 and 1024 were not inspected.
- The error notice state and the sold list with data were verified from source and unit tests only; during the runs the RPC never failed and no tracked wallet sold within the observation window.
- Coin icon hosts that send `Cross-Origin-Resource-Policy` headers make the browser log a blocked request; the site hides the image and shows the symbol.
- The live lists depend on current on-chain activity and on the public RPC's rate limits; a fresh visit may need a scan or two before wallets appear.
