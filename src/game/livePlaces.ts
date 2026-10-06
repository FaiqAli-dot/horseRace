import type { FinishPlace, RaceProgress } from './raceTypes'

export function getLivePlaces(progress: RaceProgress): Record<string, FinishPlace> {
  const ranked = Object.entries(progress)
    .sort((a, b) => b[1] - a[1])
    .map(([id], i) => [id, (i + 1) as FinishPlace] as const)
  return Object.fromEntries(ranked)
}

export function getFinalPlaces(positions: string[]): Record<string, FinishPlace> {
  const out: Record<string, FinishPlace> = {}
  positions.forEach((id, i) => {
    out[id] = (i + 1) as FinishPlace
  })
  return out
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

export function placeBadgeTone(place: FinishPlace): string {
  if (place === 1) return 'bg-gold text-ink'
  if (place === 2) return 'bg-zinc-300 text-ink'
  if (place === 3) return 'bg-amber-700 text-cream'
  return 'bg-zinc-700 text-cream'
}

export function podiumRing(place: FinishPlace): string {
  if (place === 1) return 'ring-2 ring-gold shadow-[0_0_18px_rgba(212,160,23,0.45)]'
  if (place === 2) return 'ring-2 ring-zinc-300/80'
  if (place === 3) return 'ring-2 ring-amber-700/80'
  return ''
}
