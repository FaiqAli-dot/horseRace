import { AnimatePresence, motion } from 'framer-motion'
import { getHorseById } from '../data/horses'
import { formatMoney, getPlaceLabel } from '../game/payout'
import type { FinishPlace, PayoutBreakdown } from '../game/raceTypes'
import { HorseSilhouette } from './Horse'

interface RaceResultProps {
  open: boolean
  horseId: string | null
  payout: PayoutBreakdown | null
  place: FinishPlace | null
  onRaceAgain: () => void
}

function TrophyMark({ place }: { place: FinishPlace }) {
  const fill =
    place === 1 ? '#f0c14b' : place === 2 ? '#c0c7d1' : place === 3 ? '#c47a3a' : '#666'
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden>
      <path
        fill={fill}
        d="M18 10h28v6c0 8-5 14-12 16v4h6v4H24v-4h6v-4C23 30 18 24 18 16V10z"
      />
      <path fill={fill} d="M18 12h-6c0 8 4 12 8 14M46 12h6c0 8-4 12-8 14" opacity="0.85" />
      <rect x="22" y="44" width="20" height="4" rx="1" fill={fill} />
      <rect x="18" y="48" width="28" height="6" rx="2" fill={fill} />
    </svg>
  )
}

export function RaceResult({
  open,
  horseId,
  payout,
  place,
  onRaceAgain,
}: RaceResultProps) {
  const horse = horseId ? getHorseById(horseId) : undefined
  if (!open || !payout || !place || !horse) return null

  const win = payout.isWin
  const isFirst = place === 1

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="race-result-title"
            initial={{ y: 56, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22, delay: 0.08 }}
            className={`relative w-full max-w-md overflow-hidden rounded-3xl border p-5 shadow-2xl sm:p-6 ${
              win
                ? isFirst
                  ? 'border-gold/50 bg-gradient-to-b from-[#2a2110] to-surface'
                  : 'border-emerald-400/30 bg-gradient-to-b from-[#10241c] to-surface'
                : 'border-white/10 bg-gradient-to-b from-[#241818] to-surface'
            }`}
          >
            {win && (
              <motion.div
                className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-gold/25 blur-3xl"
                animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.15, 1] }}
                transition={{ duration: 2.2, repeat: Infinity }}
              />
            )}

            <div className="relative text-center">
              {win ? (
                <>
                  <motion.div
                    initial={{ scale: 0.5, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                    className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/15"
                  >
                    <TrophyMark place={place} />
                  </motion.div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
                    {isFirst ? 'First Across the Line' : 'Podium Finish'}
                  </p>
                  <h2
                    id="race-result-title"
                    className="mt-1 font-display text-3xl font-bold text-cream"
                  >
                    You Win!
                  </h2>
                </>
              ) : (
                <>
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <span className="font-display text-xl text-rose-300/90">OUT</span>
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted">
                    Race Over
                  </p>
                  <h2
                    id="race-result-title"
                    className="mt-1 font-display text-3xl font-bold text-cream"
                  >
                    No Payout
                  </h2>
                </>
              )}

              <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-3 rounded-2xl border border-white/8 bg-ink/40 px-4 py-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-ink"
                  style={{ backgroundColor: horse.color }}
                >
                  {horse.number}
                </span>
                <div className="text-left">
                  <p className="font-display text-lg font-semibold text-cream">
                    {horse.name}
                  </p>
                  <p className="text-sm text-muted">
                    Finished{' '}
                    <span className={win ? 'text-gold-light' : 'text-cream'}>
                      {getPlaceLabel(place)}
                    </span>
                  </p>
                </div>
                <HorseSilhouette color={horse.color} className="h-10 w-14" />
              </div>

              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-ink/50 px-2 py-3">
                  <dt className="text-[10px] uppercase tracking-wider text-muted">Bet</dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-cream">
                    {formatMoney(payout.betAmount)}
                  </dd>
                </div>
                <div className="rounded-xl bg-ink/50 px-2 py-3">
                  <dt className="text-[10px] uppercase tracking-wider text-muted">
                    Payout
                  </dt>
                  <dd
                    className={`mt-1 text-sm font-semibold tabular-nums ${win ? 'text-gold-light' : 'text-cream'}`}
                  >
                    {formatMoney(payout.payout)}
                  </dd>
                </div>
                <div className="rounded-xl bg-ink/50 px-2 py-3">
                  <dt className="text-[10px] uppercase tracking-wider text-muted">
                    Profit
                  </dt>
                  <dd
                    className={`mt-1 text-sm font-semibold tabular-nums ${
                      payout.profit > 0
                        ? 'text-emerald-400'
                        : payout.profit < 0
                          ? 'text-rose-400'
                          : 'text-cream'
                    }`}
                  >
                    {payout.profit > 0 ? '+' : ''}
                    {formatMoney(payout.profit)}
                  </dd>
                </div>
              </dl>

              {win && payout.multiplier > 0 && (
                <p className="mt-3 text-xs text-muted">
                  Multiplier applied:{' '}
                  <span className="font-semibold text-gold-light">
                    {payout.multiplier.toFixed(2)}x
                  </span>
                </p>
              )}

              <button
                type="button"
                onClick={onRaceAgain}
                className="mt-6 min-h-12 w-full rounded-2xl bg-gradient-to-r from-gold-dim via-gold to-gold-light py-3 font-display text-base font-bold tracking-[0.1em] text-ink shadow-[0_8px_24px_rgba(212,160,23,0.25)]"
              >
                RACE AGAIN
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
