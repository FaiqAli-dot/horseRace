import { motion } from 'framer-motion'
import { HORSES } from '../data/horses'
import type { Market } from '../api/types'
import { HorseSilhouette } from './Horse'

interface HorseSelectorProps {
  selectedHorseId: string | null
  disabled: boolean
  market: Market
  dividendFor: (horseId: string, market?: Market) => number
  onSelect: (horseId: string) => void
}

export function HorseSelector({
  selectedHorseId,
  disabled,
  market,
  dividendFor,
  onSelect,
}: HorseSelectorProps) {
  return (
    <section className="px-4 sm:px-6">
      <div className="mb-3 flex items-end justify-between gap-2">
        <h2 className="font-display text-lg font-semibold tracking-wide text-cream">
          Select Your Horse
        </h2>
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
          Pool est. · {market.replace('_', ' ')}
        </p>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {HORSES.map((horse) => {
          const selected = selectedHorseId === horse.id
          const div = dividendFor(horse.id, market)
          return (
            <motion.button
              key={horse.id}
              type="button"
              disabled={disabled}
              whileTap={disabled ? undefined : { scale: 0.97 }}
              onClick={() => onSelect(horse.id)}
              className={`relative min-w-[140px] shrink-0 rounded-2xl border p-2.5 text-left transition-colors sm:min-w-0 sm:p-3 ${
                selected
                  ? 'border-gold bg-gold/15 shadow-[0_0_0_1px_rgba(212,160,23,0.45),0_8px_28px_rgba(212,160,23,0.18)]'
                  : 'border-white/8 bg-surface hover:border-white/20 hover:bg-surface-2'
              } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {selected && (
                <span className="absolute right-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink">
                  Selected
                </span>
              )}
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-ink"
                  style={{ backgroundColor: horse.color }}
                >
                  {horse.number}
                </span>
                <div>
                  <p className="font-display text-base font-semibold text-cream">
                    {horse.name}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">
                    #{horse.number}
                  </p>
                </div>
              </div>
              <HorseSilhouette color={horse.color} className="mb-2 h-10 w-full" />
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-muted">Est. return</span>
                <span className="font-semibold tabular-nums text-gold-light">
                  {div > 0 ? `${div.toFixed(2)}x` : '—'}
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
