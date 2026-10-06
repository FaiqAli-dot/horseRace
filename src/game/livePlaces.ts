import type { FinishPlace } from '../game/raceTypes'
import type { RaceProgress } from '../hooks/useRace'
import { getPlaceLabel } from '../game/payout'

/** Live standings from current progress (higher progress = better place). */
export function getLivePlaces(progress: RaceProgress): Record<string, FinishPlace> {
  const entries = Object.entries(progress)
  if (entries.length === 0) return {}

  // Stable sort: progress desc, then id for ties
  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0])
  })

  const places: Record<string, FinishPlace> = {}
  entries.forEach(([id], index) => {
    places[id] = (index + 1) as FinishPlace
  })
  return places
}

/** Final standings from predetermined race result. */
export function getFinalPlaces(positions: string[]): Record<string, FinishPlace> {
  const places: Record<string, FinishPlace> = {}
  positions.forEach((id, index) => {
    places[id] = (index + 1) as FinishPlace
  })
  return places
}

export function placeBadgeTone(place: FinishPlace): string {
  if (place === 1) return 'bg-[#f0c14b] text-ink border-[#f0c14b]'
  if (place === 2) return 'bg-[#c0c7d1] text-ink border-[#c0c7d1]'
  if (place === 3) return 'bg-[#c47a3a] text-cream border-[#c47a3a]'
  return 'bg-ink/85 text-cream border-white/25'
}

export function podiumRing(place: FinishPlace): string {
  if (place === 1) return 'ring-2 ring-[#f0c14b] drop-shadow-[0_0_14px_rgba(240,193,75,0.65)]'
  if (place === 2) return 'ring-2 ring-[#c0c7d1] drop-shadow-[0_0_10px_rgba(192,199,209,0.45)]'
  if (place === 3) return 'ring-2 ring-[#c47a3a] drop-shadow-[0_0_10px_rgba(196,122,58,0.45)]'
  return 'opacity-55'
}

export { getPlaceLabel }
