# Pump Wallet Watch design

Design system of the implemented site, taken from the final source. Paths are relative to the repository root. The single stylesheet is `src/styles.css`; every value below is defined there unless another file is named.

## Overview

Pump Wallet Watch is a read-only dashboard for people who follow Solana memecoin wallets. It is read to get a task done: see which wallets just bought a launchpad coin, what they paid, what they are up or down, and how long they have held. The visual character is a calm, light professional tool: one neutral palette, a near-black action color, two data colors reserved for gain and loss, system fonts, flat white cards with hairline borders and no shadows.

Hierarchy comes from spacing and two font weights, not from color. Density is moderate: 40px controls, 16px card padding, 14px table text. Composition is a single page frame (max 1200px) with, on the dashboard, a two-column grid from 1024px up: controls and lists on the left, figures and charts on the right. The wallet and FAQ pages use the same frame in one column. The disclosure panels for the two forms are a dashboard arrangement, not a rule for every page.

## Colors

All colors are hex custom properties on `:root` in `src/styles.css`. Components reference only these role tokens.

| Token | Value | Job |
| --- | --- | --- |
| `--color-bg` | `#f5f6f8` | page background |
| `--color-surface` | `#ffffff` | cards, header, inputs, stat tiles |
| `--color-surface-muted` | `#eef0f3` | hover fill of outline buttons |
| `--color-border` | `#d9dde3` | card borders, table row dividers, header rule |
| `--color-border-strong` | `#b9c0ca` | input and button borders, chart baselines, neutral marks |
| `--color-text` | `#16191e` | primary text, chart labels |
| `--color-text-secondary` | `#505a68` | labels, captions, hints, table headers |
| `--color-action` / `--color-action-hover` | `#16191e` / `#2b313a` | the one filled button per form (`.btn--primary`) |
| `--color-on-action` | `#ffffff` | text on the filled button |
| `--color-gain` | `#2a78d6` | profit bars, the profit mark beside a value, histogram bars |
| `--color-loss` | `#e34948` | loss bars and the loss mark |
| `--color-live` | `#0ca30c` | the live-status dot only, always paired with a text label |
| `--color-focus` | `#16191e` | 2px focus ring, offset 2px |
| `--color-error-bg` / `--color-error-text` | `#fdecee` / `#9a2430` | error notices |
| `--color-warn-bg` / `--color-warn-text` | `#fff4e0` / `#7a4b00` | warning notices (wallet not on the watchlist) |
| `--color-ok-bg` / `--color-ok-text` | `#e7f6e7` / `#1d5e1d` | defined for success notices; currently unused by any component |

Rules: gain and loss hues never appear on text, only on marks (`.pnl__mark`, chart rects); values stay in text tokens with a signed number. Blue is not used for links or actions, so it keeps its single meaning. The taste probe measured every rendered text pair at 390 and 1440 at 4.5:1 or better (see `artifacts/validation.md`). There is one theme; no dark mode is implemented.

## Typography

- Families: `--font-sans` is `system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`; `--font-mono` is `ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`. No font files are shipped; the system face renders.
- Weights: 400 for text, 600 for headings, buttons, the brand, stat values and active navigation. Nothing else.
- Scale (five sizes, used at every viewport): `--text-caption` 13px (hints, tags, the row label on stacked mobile rows), `--text-ui` 14px (labels, buttons, tables, status line, footer), `--text-body` 16px (body, inputs, h3), `--text-heading` 20px (h2, panel summaries, stat values), `--text-display` 28px (h1).
- Line height: 1.15 on headings, 1.5 on body. Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`. No letter-spacing and no uppercase transforms anywhere.
- Numbers that change (prices, profit, durations, counts) use `.num`, which sets `font-variant-numeric: tabular-nums`; stat values set it directly.
- Addresses and mints use `.mono` or `<code>` at 14px with `overflow-wrap: anywhere` where a full address is shown (`.address-line code`).
- Chart text is 12px sans in `--color-text-secondary` with labels in `--color-text` (`.chart text`, `.chart__label`); the SVG is sized in CSS pixels by a ResizeObserver so this text never scales.
- Prose measure is capped: `.page-title p` at 64ch, `.faq` and `.site-footer p` at 72ch.

## Layout

- Spacing steps: `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 24px, `--space-6` 32px, `--space-7` 48px. Within a group use 8 to 12px; between groups 24px (`.stack`, `.dashboard` gaps).
- Frame: `.page` is centered at `--page-max` 1200px with 16px side padding, 24px from 720px up, and 32px top padding. The header and footer share the same inner width.
- Dashboard grid: `.dashboard` is one column; from 1024px it becomes `minmax(0, 7fr) minmax(300px, 4fr)` with both children at `min-inline-size: 0` so a wide table never pushes the columns apart. `.stack` is a one-column grid with 24px gaps, also with `minmax(0, 1fr)` and children at `min-inline-size: 0`.
- Forms: `.field-grid` is two columns, four from 720px. `.add-row` is `minmax(0, 1fr) auto` (input beside its button). The filter and add-wallet forms live in `details.panel` elements that are open from 760px and collapsed below it (`useMediaQuery` in `src/engine/useMediaQuery.ts`), so the live list is on the first screen at 390.
- Stat tiles: `.stats` is a two-column grid at every width.
- Tables: from 760px a real table inside `.table-wrap` with `overflow-x: auto`; below 760px each row becomes a two-column grid of labeled cells (`td::before` prints `data-label`), the header row is visually hidden, and `.cell--wide` / `.cell--actions` span both columns.
- Header: brand at the leading edge, language select at the trailing edge; the nav wraps to its own row below 640px.
- Logical properties (`inline`, `block`, `inline-start`) are used throughout so the layout mirrors for right-to-left languages; none is shipped yet.

Observed in the browser: 320, 390 and 1440 wide in Chromium (taste probe), 390 and 1440 in the walkthrough script, 390 in WebKit. Widths between 640 and 1024 were not inspected.

## Elevation & Depth

Flat. Structure comes from 1px `--color-border` borders on `.card`, `.stat`, `.notice` surfaces and from the page background against white surfaces. There are no box shadows. The only overlays are the native `<select>` and `<details>` disclosure. Coin icons get a 1px inset outline at `rgb(0 0 0 / 0.1)` (`.coin img`).

## Shapes

- `--radius-card` 12px on cards, stat tiles, notices and panels.
- `--radius-control` 8px on inputs, buttons, the skip link and navigation links (the active nav link drops to 0 and carries a 2px inset underline instead of a fill).
- Circles for the live dot (10px), profit and loss marks (8px) and coin icons (20px).
- Chart bars have 4px rounded ends; marks are at most 24px thick (14px rows in the profit chart, up to 24px columns in the histogram).

## Components

- Header, `src/components/Header.tsx`: brand link, main nav with `aria-current="page"`, language `<select>` labeled "Language". Uses `.site-header`, `.site-nav`, `.brand`, `.lang`.
- Skip link, `src/App.tsx`: `.skip-link`, first in tab order, visible on focus, targets `#main`.
- Buttons, `.btn` in `src/styles.css`: outline by default, `.btn--primary` filled with `--color-action` (one per form), `.btn--small` 36px tall for table rows and the address line. Hover fill only under `(hover: hover)`, `scale(0.96)` on press, `opacity: 0.6` when disabled. Links styled as buttons use the same classes.
- Fields, `.field`: visible label above the control, 40px inputs, `aria-invalid` plus `aria-describedby` to the inline `.form-error` or `.caption` hint. Errors are set on submit and focus moves to the first invalid field (`FilterForm.tsx`, `AddWalletForm.tsx`, `SourcesPanel.tsx`).
- Disclosure panels, `details.panel.card` with a `<summary>` that carries the title and a caption of the current state (filter ranges, watchlist count).
- Status bar, `src/components/StatusBar.tsx`: `role="status"`, live dot with text label, last update, countdown, coins in range, SOL price, and Refresh now / Pause updates buttons (`aria-pressed`).
- Notices, `.notice--error` (`role="alert"`) and `.notice--warn`.
- Stat tiles, `src/components/StatTiles.tsx`: a `<dl>` of `.stat` items, label in `dt`, value in `dd`.
- Positions table, `src/components/PositionsTable.tsx`: `mode="open"` or `"sold"` switches the price column and the holding-time column; `showWallet={false}` on the wallet page. Cells carry `data-label` for the stacked mobile layout. Profit values render through `PnlValue` (signed number with a gain or loss mark) and coins through `CoinCell`.
- Charts, `src/components/Charts.tsx`: `PnlBars` (diverging horizontal bars around a zero line, values at the bar ends, `<title>` tooltips, a "Show as table" `<details>` fallback) and `Histogram` (single-series columns with counts on the caps). Both take `{ key, label, value }` data and a title and description rendered as a figcaption.
- Sources panel, `src/components/SourcesPanel.tsx`: a card with a `<details>` holding the data-source note and the RPC URL form.
- Pages: `src/pages/Dashboard.tsx`, `WalletPage.tsx`, `FaqPage.tsx`; routing by hash in `src/App.tsx` (`#/`, `#/wallet/<address>`, `#/faq`).

Focus: every control uses the browser's `:focus-visible` with the 2px `--color-focus` ring and 2px offset; nothing removes outlines.

## Do's and Don'ts

- Start a new page inside `<main class="page">` with a `.page-title` block (h1 plus one lead paragraph) and `.stack` sections; reuse `.card` for grouped content and never place a `.card`, `.stat` or `.notice` inside another card.
- One `.btn--primary` per form; everything else is the outline `.btn`. Links in prose are underlined text in the ink color, never blue.
- Blue and red mean gain and loss only; green means live only. Any new status needs its own token and a text label beside it.
- Keep the five type sizes and two weights; add hierarchy with spacing, not a new size.
- Every changing number gets `.num`; every address gets `.mono` and may wrap with `overflow-wrap: anywhere`.
- Tables must sit in `.table-wrap` with `data-label` on each cell so they stack below 760px.
- Any new animation goes inside `@media (prefers-reduced-motion: no-preference)` and transitions name their properties.
- All visible strings come from `t('key')` in `src/i18n/en.ts` with translations in `src/i18n/languages.ts`; never assemble sentences from fragments.

Recipe for one more page: add a route in `parseRoute` in `src/App.tsx`, create `src/pages/NewPage.tsx` returning a `.page-title` block followed by a `.stack` of `.card` sections, add its strings to `en.ts` and each language, and link it from `Header.tsx` with `aria-current` wired to the route name.
