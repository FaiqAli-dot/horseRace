import type { Horse } from '../game/raceTypes'

/** Five runners — dividends come from backend pools only. */
export const HORSES: Horse[] = [
  {
    id: 'thunder',
    name: 'Thunder',
    number: 1,
    color: '#3b82f6',
    accent: '#93c5fd',
  },
  {
    id: 'shadow',
    name: 'Shadow',
    number: 2,
    color: '#64748b',
    accent: '#cbd5e1',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    number: 3,
    color: '#dc2626',
    accent: '#fca5a5',
  },
  {
    id: 'blaze',
    name: 'Blaze',
    number: 4,
    color: '#ea580c',
    accent: '#fdba74',
  },
  {
    id: 'comet',
    name: 'Comet',
    number: 5,
    color: '#7c3aed',
    accent: '#c4b5fd',
  },
]

export function getHorseById(id: string): Horse | undefined {
  return HORSES.find((h) => h.id === id)
}
