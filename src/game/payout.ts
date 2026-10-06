import type {
  FinishPlace,
  Horse,
  PayoutBreakdown,
} from './raceTypes'

function getMultiplier(horse: Horse, place: FinishPlace): number {
  if (place === 1) return horse.multipliers.first
  if (place === 2) return horse.multipliers.second
  if (place === 3) return horse.multipliers.third
  return 0
}

export function calculatePayout(
  horse: Horse,
  place: FinishPlace,
  betAmount: number,
): PayoutBreakdown {
  const multiplier = getMultiplier(horse, place)
  const payout = Math.round(betAmount * multiplier * 100) / 100
  const profit = Math.round((payout - betAmount) * 100) / 100

  return {
    place,
    multiplier,
    betAmount,
    payout,
    profit,
    isWin: place <= 3,
  }
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getPlaceLabel(place: FinishPlace): string {
  const labels: Record<FinishPlace, string> = {
    1: '1st',
    2: '2nd',
    3: '3rd',
    4: '4th',
    5: '5th',
    6: '6th',
  }
  return labels[place]
}
