import type {
  BetDTO,
  MarketPool,
  PlaceBetResponse,
  RaceDTO,
} from './types'

/** Empty string = same-origin (Vite proxy in dev). Override with VITE_API_BASE. */
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

async function postJSON<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export const api = {
  base: API_BASE,
  health: () => getJSON<{ ok: boolean }>('/api/health'),
  current: () => getJSON<{ race: RaceDTO; pools: MarketPool[] }>('/api/races/current'),
  upcoming: () => getJSON<{ races: RaceDTO[] }>('/api/races/upcoming'),
  race: (id: string) => getJSON<{ race: RaceDTO; pools: MarketPool[] }>(`/api/races/${id}`),
  pools: (id: string) => getJSON<{ raceId: string; pools: MarketPool[] }>(`/api/races/${id}/pools`),
  balance: () => getJSON<{ balance: number; balanceCents: number }>('/api/balance'),
  playerBets: () => getJSON<{ bets: BetDTO[] }>('/api/player/bets'),
  placeBet: (body: {
    raceId: string
    horseId: string
    market: string
    stake: number
    idempotencyKey?: string
  }) => postJSON<PlaceBetResponse>('/api/bets', body, body.idempotencyKey ? { 'Idempotency-Key': body.idempotencyKey } : undefined),
  reset: () => postJSON<{ ok: boolean; balance: number }>('/api/demo/reset', {}),
  wsURL: () => {
    if (API_BASE) {
      const u = new URL(API_BASE)
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
      u.pathname = '/api/ws'
      return u.toString()
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}/api/ws`
  },
}
