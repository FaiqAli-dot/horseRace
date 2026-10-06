import { AnimatePresence, motion } from 'framer-motion'
import { HORSES } from '../data/horses'
import type { CountdownLabel, RaceProgress } from '../hooks/useRace'
import { HorseSilhouette } from './Horse'

interface RaceTrackProps {
  progress: RaceProgress
  selectedHorseId: string | null
  isRacing: boolean
  countdownLabel: CountdownLabel
}

export function RaceTrack({
  progress,
  selectedHorseId,
  isRacing,
  countdownLabel,
}: RaceTrackProps) {
  return (
    <section className="relative mx-4 overflow-hidden rounded-3xl border border-white/8 bg-track shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:mx-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,160,23,0.12),transparent_55%)]" />
      <div className="flex items-center justify-between px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${isRacing ? 'animate-pulse bg-red-500' : 'bg-gold/60'}`}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cream/80">
            Live Race
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted">
          6 Furlongs · Demo
        </span>
      </div>

      <div className="relative px-2 pb-3 pt-1 sm:px-3">
        <div className="relative h-[280px] overflow-hidden rounded-2xl border border-white/5 bg-[#1a1510] sm:h-[320px] md:h-[360px]">
          {/* Dirt texture / lanes */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#2a2218_0%,#1f1812_40%,#17120e_100%)]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 45px, rgba(255,255,255,0.04) 45px, rgba(255,255,255,0.04) 46px)',
            }}
          />
          {/* Track markings */}
          <div className="absolute inset-y-0 left-[12%] w-px bg-white/10" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
          <div className="absolute inset-y-0 left-[75%] w-px bg-white/10" />

          {/* Starting gate */}
          <div className="absolute inset-y-2 left-1 flex w-3 flex-col justify-between rounded-sm border border-white/20 bg-gradient-to-b from-zinc-600 to-zinc-800">
            {HORSES.map((h) => (
              <div key={h.id} className="h-[14%] border-b border-black/30 last:border-0" />
            ))}
          </div>

          {/* Finish line */}
          <div className="absolute inset-y-0 right-3 flex w-3 overflow-hidden rounded-sm">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, #f5f2eb 0 6px, #0a0b0f 6px 12px)',
              }}
            />
          </div>
          <div className="absolute right-7 top-2 rotate-90 origin-top-right text-[9px] font-bold tracking-[0.2em] text-cream/50">
            FINISH
          </div>

          {/* Horses */}
          <div className="absolute inset-0 py-3">
            {HORSES.map((horse, lane) => {
              const p = progress[horse.id] ?? 0
              // Leave room for horse width; gate ~4%, finish ~92% of track width
              const leftPct = 4 + p * 82
              const selected = selectedHorseId === horse.id

              return (
                <div
                  key={horse.id}
                  className="absolute left-0 right-0"
                  style={{ top: `${8 + lane * 15}%`, height: '14%' }}
                >
                  <div className="relative h-full">
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: `${leftPct}%` }}
                      animate={
                        isRacing
                          ? { y: [0, -2, 1, -1, 0] }
                          : { y: 0 }
                      }
                      transition={
                        isRacing
                          ? { duration: 0.35, repeat: Infinity, ease: 'easeInOut' }
                          : undefined
                      }
                    >
                      <div
                        className={`relative flex items-end gap-1 ${selected ? 'drop-shadow-[0_0_12px_rgba(212,160,23,0.55)]' : ''}`}
                      >
                        <div
                          className="absolute -top-4 left-1 flex h-4 min-w-4 items-center justify-center rounded-md px-1 text-[9px] font-bold text-ink"
                          style={{ backgroundColor: horse.color }}
                        >
                          {horse.number}
                        </div>
                        <HorseSilhouette
                          color={horse.color}
                          className="h-8 w-14 sm:h-9 sm:w-16"
                        />
                        {selected && (
                          <span className="absolute -bottom-3 left-0 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-gold">
                            {horse.name}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              )
            })}
          </div>

          <AnimatePresence>
            {countdownLabel && (
              <motion.div
                key={countdownLabel}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 backdrop-blur-[2px]"
              >
                <p
                  className={`font-display font-bold tracking-wider text-gold-light ${
                    countdownLabel === 'GO!' ? 'text-6xl sm:text-7xl' : 'text-5xl sm:text-6xl'
                  }`}
                >
                  {countdownLabel}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
