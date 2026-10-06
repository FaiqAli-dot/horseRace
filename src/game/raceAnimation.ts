import type { RaceAnimationPlan } from './raceTypes'
import type { RaceResultDTO } from '../services/types'

const RACE_DURATION_MS = 6800
const BASE_FINISH_MS = 5600

/**
 * Build a presentation-only animation plan from an authoritative backend result.
 * Finish ORDER is taken from `result.positions` — never shuffled client-side.
 */
export function planFromBackendResult(
  result: RaceResultDTO,
  durationMs = RACE_DURATION_MS,
): RaceAnimationPlan {
  const finishTimesMs: Record<string, number> = {}
  const seeds: Record<string, number> = {}
  result.positions.forEach((id, index) => {
    // Stagger finish times so visual order matches backend positions exactly.
    finishTimesMs[id] = BASE_FINISH_MS + index * 160
    seeds[id] = index * 97 + 13
  })
  return { finishTimesMs, durationMs, photoFinish: false, seeds }
}

/**
 * Progress 0→1 for a horse at elapsed ms.
 * Mid-race jockeying is visual only; finish order is locked by finishTimesMs.
 */
export function getHorseProgress(
  elapsedMs: number,
  horseId: string,
  plan: RaceAnimationPlan,
): number {
  const finishAt = plan.finishTimesMs[horseId] ?? plan.durationMs
  const seed = plan.seeds[horseId] ?? 0
  const t = Math.min(1, Math.max(0, elapsedMs / finishAt))

  const smooth = t * t * (3 - 2 * t)
  const eased = t * 0.4 + smooth * 0.6

  const envelope = Math.sin(Math.PI * Math.min(t, 0.92))
  const wobble =
    Math.sin(t * Math.PI * 4.2 + seed) * 0.065 +
    Math.sin(t * Math.PI * 7.1 + seed * 0.37) * 0.035

  const varied = eased + wobble * envelope * (1 - t * t)
  return Math.min(1, Math.max(0, varied))
}
