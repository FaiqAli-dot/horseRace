import { motion } from 'framer-motion'
import type { RaceDTO } from '../services/types'

interface RaceStatusBarProps {
  race: RaceDTO | null
  phaseBanner: string | null
  closesInSec: number | null
  connected: boolean
  backendOk: boolean
}

export function RaceStatusBar({
  race,
  phaseBanner,
  closesInSec,
  connected,
  backendOk,
}: RaceStatusBarProps) {
  if (!backendOk) {
    return (
      <div className="mx-4 rounded-2xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 sm:mx-6">
        <p className="font-display text-sm font-bold tracking-wide text-rose-300 sm:text-base">
          BACKEND OFFLINE
        </p>
        <p className="mt-1 text-xs text-rose-200/80">
          Start the Go server on port 8080. This demo does not run without the backend.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/8 bg-surface/90 px-3 py-2.5 sm:mx-6 sm:px-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
          Live · {connected ? 'WebSocket' : 'Polling'}
        </p>
        <p className="font-display text-lg font-bold text-cream sm:text-xl">
          Race #{race?.raceNumber ?? '—'}
          <span className="ml-2 text-sm font-semibold text-gold">
            {phaseBanner ?? race?.status ?? '…'}
          </span>
        </p>
      </div>
      {closesInSec !== null && race?.status === 'BETTING_OPEN' && (
        <motion.div
          key={closesInSec}
          initial={{ scale: 1.06 }}
          animate={{ scale: 1 }}
          className="rounded-xl border border-gold/35 bg-gold/10 px-3 py-2 text-right"
        >
          <p className="text-[9px] uppercase tracking-[0.16em] text-gold/80">Countdown</p>
          <p className="font-display text-2xl font-bold tabular-nums text-gold-light">
            {closesInSec}s
          </p>
        </motion.div>
      )}
      {race?.status === 'LOCKED' && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-950/40 px-3 py-2 text-sm font-semibold text-amber-200">
          🔒 LOCKED
        </div>
      )}
    </div>
  )
}
