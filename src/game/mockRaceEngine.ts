import { HORSES } from '../data/horses'
import type {
  FinishPlace,
  RaceAnimationPlan,
  RacePayouts,
  RaceResult,
} from './raceTypes'

const RACE_DURATION_MS = 6800
const BASE_FINISH_MS = 5600

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleIds(rng: () => number): string[] {
  const ids = HORSES.map((h) => h.id)
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

function createRaceId(rng: () => number): string {
  return `race-${Date.now().toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`
}

/**
 * Determines the full race outcome BEFORE any animation runs.
 * Animation modules must consume this result; they must never rewrite it.
 */
export function runMockRace(seed?: number): {
  result: RaceResult
  payouts: RacePayouts
  animation: RaceAnimationPlan
} {
  const rng = mulberry32(seed ?? Math.floor(Math.random() * 2 ** 31))
  const positions = shuffleIds(rng)
  const raceId = createRaceId(rng)

  const result: RaceResult = {
    raceId,
    positions,
    winner: positions[0],
    second: positions[1],
    third: positions[2],
  }

  const payouts: RacePayouts = {
    raceId,
    horses: HORSES.map((h) => ({
      horseId: h.id,
      first: h.multipliers.first,
      second: h.multipliers.second,
      third: h.multipliers.third,
    })),
  }

  // Rare photo-finish: compress the gap between adjacent place finishers.
  const photoFinish = rng() < 0.18
  const finishTimesMs: Record<string, number> = {}
  const seeds: Record<string, number> = {}

  positions.forEach((horseId, index) => {
    const placeGap = photoFinish && index < 3 ? 55 + rng() * 40 : 140 + rng() * 90
    const jitter = rng() * 40
    finishTimesMs[horseId] = BASE_FINISH_MS + index * placeGap + jitter
    seeds[horseId] = rng() * 1000
  })

  const animation: RaceAnimationPlan = {
    finishTimesMs,
    durationMs: RACE_DURATION_MS,
    photoFinish,
    seeds,
  }

  return { result, payouts, animation }
}

export function getPlaceForHorse(
  result: RaceResult,
  horseId: string,
): FinishPlace {
  const index = result.positions.indexOf(horseId)
  return ((index >= 0 ? index : 5) + 1) as FinishPlace
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

  // Blend linear + smoothstep so horses leave the gate visibly (not stuck at 0).
  const smooth = t * t * (3 - 2 * t)
  const eased = t * 0.4 + smooth * 0.6

  // Mid-race variation fades near the finish so order stays correct.
  const envelope = Math.sin(Math.PI * Math.min(t, 0.92))
  const wobble =
    Math.sin(t * Math.PI * 4.2 + seed) * 0.065 +
    Math.sin(t * Math.PI * 7.1 + seed * 0.37) * 0.035

  const varied = eased + wobble * envelope * (1 - t * t)
  return Math.min(1, Math.max(0, varied))
}
