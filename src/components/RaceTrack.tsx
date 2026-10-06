import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { HORSES } from '../data/horses'
import {
  getFinalPlaces,
  getLivePlaces,
  getPlaceLabel,
  placeBadgeTone,
  podiumRing,
} from '../game/livePlaces'
import type { RaceResult } from '../game/raceTypes'
import type { CountdownLabel, RaceProgress } from '../hooks/useRace'
import { Confetti } from './Confetti'
import { HorseSilhouette } from './Horse'

/** Track travel as fraction of lane width (gate → finish). */
const TRAVEL = 0.82
const GATE = 0.04

interface RaceTrackProps {
  progress: RaceProgress
  progressRef: MutableRefObject<RaceProgress>
  selectedHorseId: string | null
  isRacing: boolean
  countdownLabel: CountdownLabel
  result: RaceResult | null
  showFinishMoment: boolean
  confettiActive: boolean
  finishIntensity: 'win' | 'podium' | 'loss' | null
}

export function RaceTrack({
  progress,
  progressRef,
  selectedHorseId,
  isRacing,
  countdownLabel,
  result,
  showFinishMoment,
  confettiActive,
  finishIntensity,
}: RaceTrackProps) {
  const laneRef = useRef<HTMLDivElement>(null)
  const mountRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const livePlaces = useMemo(() => {
    if (showFinishMoment && result) return getFinalPlaces(result.positions)
    if (isRacing || Object.keys(progress).length > 0) return getLivePlaces(progress)
    return {}
  }, [progress, isRacing, showFinishMoment, result])

  const showPlaces = isRacing || showFinishMoment

  // Imperative transform updates — avoids relying on React paint cadence on mobile.
  useEffect(() => {
    let raf = 0
    const trackWidth = () => laneRef.current?.clientWidth ?? 0

    const apply = () => {
      const w = trackWidth()
      if (w > 0) {
        const source = progressRef.current
        for (const horse of HORSES) {
          const el = mountRefs.current[horse.id]
          if (!el) continue
          const p = source[horse.id] ?? 0
          const x = (GATE + p * TRAVEL) * w
          el.style.transform = `translate3d(${x}px, -50%, 0)`
        }
      }
      raf = requestAnimationFrame(apply)
    }

    raf = requestAnimationFrame(apply)
    return () => cancelAnimationFrame(raf)
  }, [progressRef])

  // Snap positions when React progress jumps (finish stagger / reset).
  useEffect(() => {
    const w = laneRef.current?.clientWidth ?? 0
    if (w <= 0) return
    for (const horse of HORSES) {
      const el = mountRefs.current[horse.id]
      if (!el) continue
      const p = progress[horse.id] ?? 0
      const x = (GATE + p * TRAVEL) * w
      el.style.transform = `translate3d(${x}px, -50%, 0)`
    }
  }, [progress, showFinishMoment])

  return (
    <section className="relative mx-4 overflow-hidden rounded-3xl border border-white/8 bg-track shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:mx-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,160,23,0.12),transparent_55%)]" />
      <div className="flex items-center justify-between px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${isRacing || showFinishMoment ? 'animate-pulse bg-red-500' : 'bg-gold/60'}`}
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
        <div
          ref={laneRef}
          className="relative h-[240px] overflow-hidden rounded-2xl border border-white/5 bg-[#1a1510] sm:h-[280px] md:h-[320px]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#2a2218_0%,#1f1812_40%,#17120e_100%)]" />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 45px, rgba(255,255,255,0.04) 45px, rgba(255,255,255,0.04) 46px)',
            }}
          />
          <div className="absolute inset-y-0 left-[12%] w-px bg-white/10" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
          <div className="absolute inset-y-0 left-[75%] w-px bg-white/10" />

          <div className="absolute inset-y-2 left-1 flex w-3 flex-col justify-between rounded-sm border border-white/20 bg-gradient-to-b from-zinc-600 to-zinc-800">
            {HORSES.map((h) => (
              <div key={h.id} className="h-[14%] border-b border-black/30 last:border-0" />
            ))}
          </div>

          <div
            className={`absolute inset-y-0 right-3 flex w-3 overflow-hidden rounded-sm transition-shadow duration-500 ${
              showFinishMoment ? 'shadow-[0_0_24px_rgba(240,193,75,0.55)]' : ''
            }`}
          >
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, #f5f2eb 0 6px, #0a0b0f 6px 12px)',
              }}
            />
          </div>
          <div className="absolute right-7 top-2 origin-top-right rotate-90 text-[9px] font-bold tracking-[0.2em] text-cream/50">
            FINISH
          </div>

          <div className="absolute inset-0 py-3">
            {HORSES.map((horse, lane) => {
              const selected = selectedHorseId === horse.id
              const place = livePlaces[horse.id]
              const finishPlace =
                showFinishMoment && result
                  ? ((result.positions.indexOf(horse.id) + 1) as 1 | 2 | 3 | 4 | 5 | 6)
                  : null
              const isPodium = finishPlace !== null && finishPlace <= 3
              const galloping = isRacing && !showFinishMoment

              return (
                <div
                  key={horse.id}
                  className="absolute left-0 right-0"
                  style={{ top: `${8 + lane * 15}%`, height: '14%' }}
                >
                  <div className="relative h-full">
                    <div
                      ref={(node) => {
                        mountRefs.current[horse.id] = node
                      }}
                      className="horse-mount absolute top-1/2 left-0 will-change-transform"
                      style={{ transform: 'translate3d(0, -50%, 0)' }}
                    >
                      <div
                        className={`relative flex items-end ${
                          selected && !showFinishMoment
                            ? 'drop-shadow-[0_0_12px_rgba(212,160,23,0.55)]'
                            : ''
                        } ${showFinishMoment && finishPlace ? podiumRing(finishPlace) : ''} ${
                          showFinishMoment && finishPlace && finishPlace > 3 ? 'scale-95' : ''
                        } ${showFinishMoment && isPodium ? 'z-10 scale-110' : ''}`}
                      >
                        {showPlaces && place && (
                          <span
                            className={`absolute -top-5 left-1/2 z-10 -translate-x-1/2 rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none tracking-wide shadow-sm sm:text-[10px] ${placeBadgeTone(place)}`}
                          >
                            {getPlaceLabel(place)}
                          </span>
                        )}

                        <div
                          className="absolute -top-0.5 left-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-md px-1 text-[8px] font-bold text-ink sm:h-4 sm:min-w-4 sm:text-[9px]"
                          style={{ backgroundColor: horse.color }}
                        >
                          {horse.number}
                        </div>

                        <HorseSilhouette
                          color={horse.color}
                          galloping={galloping}
                          className="h-8 w-14 sm:h-9 sm:w-16"
                        />

                        {selected && (
                          <span className="absolute -bottom-3 left-0 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-gold">
                            {horse.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Confetti
            active={confettiActive}
            intensity={finishIntensity ?? 'loss'}
          />

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

          <AnimatePresence>
            {showFinishMoment && (
              <motion.div
                key="finish-banner"
                data-testid="finish-banner"
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center"
              >
                <div className="rounded-full border border-gold/50 bg-ink/80 px-4 py-1.5 shadow-[0_0_28px_rgba(212,160,23,0.35)] backdrop-blur-sm">
                  <p className="font-display text-sm font-bold tracking-[0.22em] text-gold-light sm:text-base">
                    FINISH
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
