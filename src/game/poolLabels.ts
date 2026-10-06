import type { HorsePoolSlice, Market, MarketPool } from '../services/types'

export type CrowdLabel = 'MOST BACKED' | 'DARK HORSE' | 'LONG SHOT'

/** Derive social/crowd labels from live pool distribution (WIN market preferred). */
export function crowdLabelsForPools(
  pools: MarketPool[],
  market: Market = 'WIN',
): Record<string, CrowdLabel | null> {
  const mp = pools.find((p) => p.market === market) ?? pools[0]
  const out: Record<string, CrowdLabel | null> = {}
  if (!mp) return out

  const backed = mp.perHorse.filter((h) => h.amountCents > 0)
  if (backed.length === 0) {
    for (const h of mp.perHorse) out[h.horseId] = null
    return out
  }

  const byPct = [...backed].sort((a, b) => b.percentage - a.percentage)
  const most = byPct[0]
  const long = [...backed].sort((a, b) => b.estimatedDividend - a.estimatedDividend)[0]
  // Dark horse: mid pack with non-trivial share but not favourite
  const mid = byPct.find(
    (h) =>
      h.horseId !== most.horseId &&
      h.horseId !== long?.horseId &&
      h.percentage >= 8 &&
      h.percentage <= 28,
  )

  for (const h of mp.perHorse) out[h.horseId] = null
  if (most) out[most.horseId] = 'MOST BACKED'
  if (long && long.horseId !== most?.horseId) out[long.horseId] = 'LONG SHOT'
  if (mid) out[mid.horseId] = 'DARK HORSE'
  return out
}

export function totalPoolCents(pools: MarketPool[]): number {
  return pools.reduce((sum, p) => sum + p.totalPoolCents, 0)
}

export function sliceFor(
  pools: MarketPool[],
  market: Market,
  horseId: string,
): HorsePoolSlice | undefined {
  return pools.find((p) => p.market === market)?.perHorse.find((h) => h.horseId === horseId)
}
