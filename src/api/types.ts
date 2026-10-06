export type Market = 'WIN' | 'PLACE_2' | 'PLACE_3'
export type RaceStatus =
  | 'SCHEDULED'
  | 'BETTING_OPEN'
  | 'LOCKED'
  | 'RACING'
  | 'FINISHED'
  | 'SETTLED'
  | 'CANCELLED'

export interface HorseDTO {
  id: string
  name: string
  number: number
  color: string
}

export interface RaceResultDTO {
  raceId: string
  positions: string[]
  winner: string
  second: string
  third: string
  seed?: number
  generatedAt: string
}

export interface HorsePoolSlice {
  horseId: string
  amountCents: number
  percentage: number
  estimatedDividend: number
}

export interface MarketPool {
  market: Market
  totalPoolCents: number
  takeoutRate: number
  takeoutCents: number
  distributablePoolCents: number
  perHorse: HorsePoolSlice[]
}

export interface RaceDTO {
  id: string
  raceNumber: number
  status: RaceStatus
  scheduledAt: string
  bettingOpenAt: string
  bettingCloseAt: string
  raceStartAt: string
  resultAt?: string | null
  settledAt?: string | null
  horses: HorseDTO[]
  takeoutRate: number
  configVersion: string
  result?: RaceResultDTO | null
  serverNow?: string
}

export interface BetDTO {
  id: string
  playerId: string
  raceId: string
  horseId: string
  market: Market
  stakeCents: number
  createdAt: string
  status: string
  potentialDividendAtPlacement: number
  finalDividend: number
  payoutCents: number
  settlementStatus: string
}

export interface PlaceBetResponse {
  betId: string
  status: string
  estimatedDividend: number
  stakeCents: number
  stake: number
  raceId: string
  horseId: string
  market: Market
  balanceCents: number
  balance: number
}
