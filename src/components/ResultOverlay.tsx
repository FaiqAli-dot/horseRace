import { AnimatePresence, motion } from 'framer-motion'
import { getHorseById } from '../data/horses'
import { formatMoney } from '../services/money'
import type { BetDTO, RaceDTO } from '../services/types'
import { HorseSilhouette } from './Horse'

interface ResultOverlayProps {
  open: boolean
  race: RaceDTO | null
  myBets: BetDTO[]
  onDismiss: () => void
}

export function ResultOverlay({ open, race, myBets, onDismiss }: ResultOverlayProps) {
  const result = race?.result
  if (!open || !race || !result) return null

  const winner = getHorseById(result.winner)
  const second = getHorseById(result.second)
  const third = getHorseById(result.third)
  const settled = myBets.filter(
    (b) =>
      b.raceId === race.id &&
      (b.settlementStatus === 'SETTLED' || b.settlementStatus === 'REFUNDED'),
  )
  const won = settled.some(
    (b) => b.settlementStatus === 'SETTLED' && b.payoutCents > b.stakeCents,
  )
  const refunded = settled.some((b) => b.settlementStatus === 'REFUNDED')
  const lost = settled.length > 0 && !won && !refunded
  const payout = settled.reduce((s, b) => s + b.payoutCents, 0) / 100

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="w-full max-w-md rounded-3xl border border-gold/30 bg-gradient-to-b from-[#221c10] to-surface p-5 shadow-2xl"
          >
            <p className="text-center text-[10px] uppercase tracking-[0.2em] text-gold/70">
              Race #{race.raceNumber} · Result
            </p>
            <h2 className="mt-1 text-center font-display text-2xl font-bold text-cream">
              {won ? 'YOU WON' : lost ? 'BET LOST' : refunded ? 'REFUNDED' : 'Podium'}
            </h2>

            <div className="mt-4 flex items-end justify-center gap-3">
              {[
                { h: second, place: 2, hClass: 'h-14' },
                { h: winner, place: 1, hClass: 'h-16' },
                { h: third, place: 3, hClass: 'h-12' },
              ].map(({ h, place, hClass }) =>
                h ? (
                  <div key={place} className="flex flex-col items-center gap-1">
                    <div className={hClass}>
                      <HorseSilhouette
                        color={h.color}
                        galloping={false}
                        className="h-full w-auto"
                      />
                    </div>
                    <span className="text-xs font-bold text-gold">{place}</span>
                    <span className="text-[11px] text-cream">{h.name}</span>
                  </div>
                ) : null,
              )}
            </div>

            {settled.length > 0 && (
              <p className="mt-4 text-center text-sm tabular-nums text-cream">
                {won || refunded
                  ? `Payout ${formatMoney(payout)}`
                  : `Stake lost · ${formatMoney(settled.reduce((s, b) => s + b.stakeCents, 0) / 100)}`}
              </p>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="mt-5 min-h-12 w-full rounded-2xl bg-gold font-display text-base font-bold text-ink"
            >
              Next race
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
