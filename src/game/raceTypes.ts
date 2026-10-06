/** Shared race / payout contracts — UI stays independent of the mock engine. */

export type GameState =
  | 'idle'
  | 'betting'
  | 'countdown'
  | 'racing'
  | 'finished'

export type FinishPlace = 1 | 2 | 3 | 4 | 5 | 6

export interface HorseMultipliers {
  first: number
  second: number
  third: number
}

export interface Horse {
  id: string
  name: string
  number: number
  color: string
  accent: string
  multipliers: HorseMultipliers
}

/** Shape a backend race result payload would return. */
export interface RaceResult {
  raceId: string
  positions: string[]
  winner: string
  second: string
  third: string
}

/** Per-horse payout table a backend might attach to a race. */
export interface HorsePayoutTable {
  horseId: string
  first: number
  second: number
  third: number
}

export interface RacePayouts {
  raceId: string
  horses: HorsePayoutTable[]
}

export interface BetSlip {
  horseId: string
  amount: number
}

export interface PayoutBreakdown {
  place: FinishPlace
  multiplier: number
  betAmount: number
  payout: number
  profit: number
  isWin: boolean
}

export interface HistoryEntry {
  id: string
  raceId: string
  horseId: string
  horseName: string
  place: FinishPlace
  betAmount: number
  payout: number
  profit: number
  timestamp: number
}

export interface LastResultEntry {
  raceId: string
  winnerName: string
  winnerNumber: number
  winnerColor: string
}

export interface RaceAnimationPlan {
  /** Finish times in ms from race start, keyed by horse id (lower = finishes earlier). */
  finishTimesMs: Record<string, number>
  durationMs: number
  photoFinish: boolean
  /** Seeds for mid-race motion variation. */
  seeds: Record<string, number>
}
