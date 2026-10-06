import type { Horse } from '../game/raceTypes'

export const HORSES: Horse[] = [
  {
    id: 'thunder',
    name: 'Thunder',
    number: 1,
    color: '#3b82f6',
    accent: '#93c5fd',
    multipliers: { first: 3.0, second: 1.8, third: 1.2 },
  },
  {
    id: 'rocket',
    name: 'Rocket',
    number: 2,
    color: '#dc2626',
    accent: '#fca5a5',
    multipliers: { first: 2.5, second: 1.6, third: 1.15 },
  },
  {
    id: 'shadow',
    name: 'Shadow',
    number: 3,
    color: '#64748b',
    accent: '#cbd5e1',
    multipliers: { first: 4.0, second: 2.0, third: 1.3 },
  },
  {
    id: 'blaze',
    name: 'Blaze',
    number: 4,
    color: '#ea580c',
    accent: '#fdba74',
    multipliers: { first: 2.8, second: 1.7, third: 1.2 },
  },
  {
    id: 'storm',
    name: 'Storm',
    number: 5,
    color: '#0d9488',
    accent: '#5eead4',
    multipliers: { first: 3.5, second: 1.9, third: 1.25 },
  },
  {
    id: 'comet',
    name: 'Comet',
    number: 6,
    color: '#7c3aed',
    accent: '#c4b5fd',
    multipliers: { first: 5.0, second: 2.2, third: 1.4 },
  },
]

export function getHorseById(id: string): Horse | undefined {
  return HORSES.find((h) => h.id === id)
}
