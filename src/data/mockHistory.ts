import type { LastResultEntry } from '../game/raceTypes'
import { HORSES } from './horses'

/** Static showcase strip — demo data only, not real gambling history. */
export const MOCK_LAST_RESULTS: LastResultEntry[] = [
  { raceId: 'demo-01', winnerName: 'Blaze', winnerNumber: 4, winnerColor: HORSES[3].color },
  { raceId: 'demo-02', winnerName: 'Thunder', winnerNumber: 1, winnerColor: HORSES[0].color },
  { raceId: 'demo-03', winnerName: 'Comet', winnerNumber: 6, winnerColor: HORSES[5].color },
  { raceId: 'demo-04', winnerName: 'Shadow', winnerNumber: 3, winnerColor: HORSES[2].color },
  { raceId: 'demo-05', winnerName: 'Rocket', winnerNumber: 2, winnerColor: HORSES[1].color },
  { raceId: 'demo-06', winnerName: 'Storm', winnerNumber: 5, winnerColor: HORSES[4].color },
  { raceId: 'demo-07', winnerName: 'Thunder', winnerNumber: 1, winnerColor: HORSES[0].color },
  { raceId: 'demo-08', winnerName: 'Blaze', winnerNumber: 4, winnerColor: HORSES[3].color },
  { raceId: 'demo-09', winnerName: 'Rocket', winnerNumber: 2, winnerColor: HORSES[1].color },
  { raceId: 'demo-10', winnerName: 'Shadow', winnerNumber: 3, winnerColor: HORSES[2].color },
]
