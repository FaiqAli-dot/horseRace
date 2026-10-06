/** Shared UI types for race presentation (not betting economics). */

export type FinishPlace = 1 | 2 | 3 | 4 | 5 | 6

export interface Horse {
  id: string
  name: string
  number: number
  color: string
  accent: string
}

export interface RaceResult {
  raceId: string
  positions: string[]
  winner: string
  second: string
  third: string
}

export interface RaceAnimationPlan {
  /** Finish times in ms from race start, keyed by horse id (lower = finishes earlier). */
  finishTimesMs: Record<string, number>
  durationMs: number
  photoFinish: boolean
  /** Seeds for mid-race motion variation only. */
  seeds: Record<string, number>
}

export type CountdownLabel = 'READY' | '3' | '2' | '1' | 'GO!' | null

export interface RaceProgress {
  [horseId: string]: number
}

export type FinishIntensity = 'win' | 'podium' | 'loss'
