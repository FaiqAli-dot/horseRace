import { motion } from 'framer-motion'
import { HORSES } from '../data/horses'
import { crowdLabelsForPools } from '../game/poolLabels'
import { formatDividend, formatPercent } from '../services/money'
import type { Market, MarketPool } from '../services/types'

interface PoolTableProps {
  pools: MarketPool[]
  locked: boolean
  selectedHorseId: string | null
  selectedMarket: Market
  onSelect: (horseId: string, market: Market) => void
  disabled: boolean
}

function div(pools: MarketPool[], market: Market, horseId: string): number {
  return (
    pools.find((p) => p.market === market)?.perHorse.find((h) => h.horseId === horseId)
      ?.estimatedDividend ?? 0
  )
}

function pct(pools: MarketPool[], horseId: string): number {
  const win = pools.find((p) => p.market === 'WIN')
  return win?.perHorse.find((h) => h.horseId === horseId)?.percentage ?? 0
}

export function PoolTable({
  pools,
  locked,
  selectedHorseId,
  selectedMarket,
  onSelect,
  disabled,
}: PoolTableProps) {
  const labels = crowdLabelsForPools(pools, 'WIN')

  return (
    <section className="px-4 sm:px-6">
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-cream">Betting Pool</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
            locked
              ? 'border border-amber-400/40 bg-amber-950/50 text-amber-200'
              : 'border border-emerald-400/30 bg-emerald-950/40 text-emerald-300'
          }`}
        >
          {locked ? '🔒 Locked' : 'Live'}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/8 bg-surface/90">
        <div className="grid grid-cols-[minmax(0,1.4fr)_0.7fr_0.7fr_0.7fr_0.7fr] gap-1 border-b border-white/8 bg-surface-2/80 px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted sm:px-3 sm:text-[10px]">
          <span>Horse</span>
          <span className="text-right">% Pool</span>
          <span className="text-right">Win</span>
          <span className="text-right">2nd</span>
          <span className="text-right">3rd</span>
        </div>

        <ul>
          {HORSES.map((horse) => {
            const p = pct(pools, horse.id)
            const winD = div(pools, 'WIN', horse.id)
            const p2 = div(pools, 'PLACE_2', horse.id)
            const p3 = div(pools, 'PLACE_3', horse.id)
            const crowd = labels[horse.id]
            const selected = selectedHorseId === horse.id

            return (
              <li
                key={horse.id}
                className={`grid grid-cols-[minmax(0,1.4fr)_0.7fr_0.7fr_0.7fr_0.7fr] items-center gap-1 border-b border-white/5 px-2 py-2.5 last:border-0 sm:px-3 ${
                  selected ? 'bg-gold/10' : ''
                }`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(horse.id, selectedMarket)}
                  className="flex min-w-0 items-center gap-2 text-left disabled:opacity-60"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-ink"
                    style={{ backgroundColor: horse.color }}
                  >
                    {horse.number}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-cream">
                      {horse.name}
                    </span>
                    {crowd && (
                      <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-gold/80">
                        {crowd}
                      </span>
                    )}
                  </span>
                </button>

                <div className="text-right">
                  <motion.span
                    key={`${horse.id}-${Math.round(p * 10)}`}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    className="text-sm font-semibold tabular-nums text-cream"
                  >
                    {formatPercent(p)}
                  </motion.span>
                  <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-ink/80">
                    <motion.div
                      className="h-full rounded-full bg-gold/80"
                      animate={{ width: `${Math.min(100, p)}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                    />
                  </div>
                </div>

                {(
                  [
                    ['WIN', winD],
                    ['PLACE_2', p2],
                    ['PLACE_3', p3],
                  ] as const
                ).map(([m, d]) => {
                  const active = selected && selectedMarket === m
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSelect(horse.id, m)}
                      className={`min-h-10 rounded-lg text-right text-sm font-semibold tabular-nums transition ${
                        active
                          ? 'bg-gold text-ink'
                          : 'text-cream/90 hover:bg-white/5'
                      } px-1 disabled:opacity-55`}
                    >
                      <motion.span
                        key={`${horse.id}-${m}-${d.toFixed(2)}`}
                        initial={{ y: 4, opacity: 0.5 }}
                        animate={{ y: 0, opacity: 1 }}
                      >
                        {formatDividend(d)}
                      </motion.span>
                    </button>
                  )
                })}
              </li>
            )
          })}
        </ul>
      </div>
      <p className="mt-1.5 text-[10px] text-muted">
        Tap a dividend cell to set horse + market. Final dividend is set when betting closes.
      </p>
    </section>
  )
}
