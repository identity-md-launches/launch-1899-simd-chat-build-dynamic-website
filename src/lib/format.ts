export function formatUsd(value: number, locale: string, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  const n = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(abs);
  if (value < 0) return `−${n}`;
  return opts.sign && value > 0 ? `+${n}` : n;
}

/** Prices of memecoins are tiny; show enough significant digits to tell them apart. */
export function formatPrice(value: number, locale: string): string {
  if (value === 0) return '$0';
  if (value >= 0.01) return formatUsd(value, locale);
  const n = new Intl.NumberFormat(locale, { maximumSignificantDigits: 3 }).format(value);
  return `$${n}`;
}

export function formatCompactUsd(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number, locale: string, digits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

export function formatSol(value: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: value >= 1 ? 2 : 4 }).format(value)} SOL`;
}

export function formatDuration(seconds: number, locale: string): string {
  const s = Math.max(0, Math.round(seconds));
  const rtf = (unit: Intl.RelativeTimeFormatUnit, n: number) =>
    new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow', maximumFractionDigits: 0 }).format(n);
  if (s < 60) return rtf('second', s);
  if (s < 3600) {
    const m = Math.floor(s / 60);
    return `${rtf('minute', m)} ${rtf('second', s % 60)}`;
  }
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    return `${rtf('hour', h)} ${rtf('minute', Math.floor((s % 3600) / 60))}`;
  }
  const d = Math.floor(s / 86400);
  return `${rtf('day', d)} ${rtf('hour', Math.floor((s % 86400) / 3600))}`;
}

export function formatTime(unixSeconds: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(unixSeconds * 1000));
}

export function formatAgo(unixSeconds: number, nowSeconds: number, locale: string): string {
  const diff = unixSeconds - nowSeconds;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value);
}
