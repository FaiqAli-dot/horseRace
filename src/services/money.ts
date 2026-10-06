export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function centsToDollars(cents: number): number {
  return cents / 100
}

export function formatDividend(d: number): string {
  if (!Number.isFinite(d) || d <= 0) return '—'
  return `${d.toFixed(2)}x`
}

export function formatPercent(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) return '0%'
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`
}
