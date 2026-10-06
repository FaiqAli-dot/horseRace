import { motion } from 'framer-motion'
import { HORSES } from '../data/horses'
import { HorseSilhouette } from './Horse'

interface HorseSelectorProps {
  selectedHorseId: string | null
  disabled: boolean
  onSelect: (horseId: string) => void
}

export function HorseSelector({
  selectedHorseId,
  disabled,
  onSelect,
}: HorseSelectorProps) {
  return (
    <section className="px-4 sm:px-6">
      <div className="mb-3 flex items-end justify-between gap-2">
        <h2 className="font-display text-lg font-semibold tracking-wide text-cream">
          Select Your Horse
        </h2>
        <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
          Tap to lock in
        </p>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {HORSES.map((horse) => {
          const selected = selectedHorseId === horse.id
          return (
            <motion.button
              key={horse.id}
              type="button"
              disabled={disabled}
              whileTap={disabled ? undefined : { scale: 0.97 }}
              onClick={() => onSelect(horse.id)}
              className={`relative min-w-[148px] shrink-0 rounded-2xl border p-3 text-left transition-colors sm:min-w-0 ${
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
              <div className="space-y-1 text-[11px] tabular-nums">
                <div className="flex justify-between text-cream/90">
                  <span className="text-muted">1st</span>
                  <span className="font-semibold text-gold-light">
                    {horse.multipliers.first.toFixed(2)}x
                  </span>
                </div>
                <div className="flex justify-between text-cream/80">
                  <span className="text-muted">2nd</span>
                  <span className="font-medium">{horse.multipliers.second.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between text-cream/70">
                  <span className="text-muted">3rd</span>
                  <span className="font-medium">{horse.multipliers.third.toFixed(2)}x</span>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
