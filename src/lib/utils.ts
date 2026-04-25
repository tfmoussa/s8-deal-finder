import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ─── Tailwind class merge ────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency formatting ─────────────────────────────────────────────────────
export function formatCurrency(
  value: number | undefined | null,
  opts: { compact?: boolean; showCents?: boolean } = {}
): string {
  if (value == null || isNaN(value)) return '—';
  const { compact = false, showCents = false } = opts;

  if (compact && Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(value);
}

// ─── Percentage formatting ───────────────────────────────────────────────────
export function formatPct(value: number | undefined | null, decimals = 2): string {
  if (value == null || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

// ─── Number formatting ───────────────────────────────────────────────────────
export function formatNumber(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

// ─── Beds/baths label ────────────────────────────────────────────────────────
export function formatBedBath(beds?: number, baths?: number): string {
  const b = beds != null ? `${beds}bd` : '';
  const ba = baths != null ? `${baths}ba` : '';
  return [b, ba].filter(Boolean).join(' / ');
}

// ─── Address short-form ──────────────────────────────────────────────────────
export function shortAddress(address: string): string {
  // Remove "United States" suffix if present
  return address.replace(/,?\s*United States$/, '');
}

// ─── Date helpers ────────────────────────────────────────────────────────────
export function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function isExpired(isoDate: string | null | undefined): boolean {
  if (!isoDate) return true;
  return new Date(isoDate) <= new Date();
}

export function formatDate(isoDate: string | undefined | null): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Clamp ───────────────────────────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── Debounce ────────────────────────────────────────────────────────────────
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ─── Cashflow color helper ───────────────────────────────────────────────────
export function cashflowColor(value: number | undefined | null): string {
  if (value == null) return 'text-muted-foreground';
  if (value > 0) return 'text-emerald-600';
  if (value < 0) return 'text-red-500';
  return 'text-muted-foreground';
}

// ─── Crime level color ───────────────────────────────────────────────────────
export function crimeLevelColor(level: string): string {
  switch (level) {
    case 'HIGHEST': return 'text-red-600';
    case 'ABOVE_AVERAGE': return 'text-amber-500';
    case 'AVERAGE': return 'text-yellow-500';
    case 'LOW': return 'text-emerald-600';
    default: return 'text-muted-foreground';
  }
}

export function crimeLevelBg(level: string): string {
  switch (level) {
    case 'HIGHEST': return 'bg-red-600';
    case 'ABOVE_AVERAGE': return 'bg-amber-500';
    case 'AVERAGE': return 'bg-yellow-400';
    case 'LOW': return 'bg-emerald-500';
    default: return 'bg-muted';
  }
}

// ─── FMR by bedroom ─────────────────────────────────────────────────────────
export function fmrForBeds(
  beds: number,
  fmrData: { efficiency: number; oneBr: number; twoBr: number; threeBr: number; fourBr: number }
): number {
  if (beds === 0) return fmrData.efficiency;
  if (beds === 1) return fmrData.oneBr;
  if (beds === 2) return fmrData.twoBr;
  if (beds === 3) return fmrData.threeBr;
  return fmrData.fourBr;
}

// ─── Truncate text ───────────────────────────────────────────────────────────
export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

// ─── Slug-safe state/county ─────────────────────────────────────────────────
export function toSlug(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ─── Parse numeric env vars safely ──────────────────────────────────────────
export function envNum(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}
