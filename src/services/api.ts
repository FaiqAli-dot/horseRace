import { friendlyError } from './errors'
import type {
  BalanceResponse,
  BetDTO,
  MarketPool,
  PlaceBetResponse,
  RaceDTO,
  RaceResultDTO,
} from './types'

/**
 * Base URL for the Go API.
 * Set VITE_API_BASE_URL (or legacy VITE_API_BASE) to your host / Tailscale IP.
 * Default: http://localhost:8080
 */
const RAW =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  'http://localhost:8080'

export const API_BASE_URL = RAW.replace(/\/$/, '')

export function getWsURL(): string {
  const u = new URL(API_BASE_URL)
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
  u.pathname = '/api/ws'
  u.search = ''
  u.hash = ''
  return u.toString()
}

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseError(res: Response): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  throw new ApiError(body.error ?? (res.statusText || 'Request failed'), res.status)
}

async function getJSON<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`)
  } catch (e) {
    throw new Error(friendlyError(e))
  }
  if (!res.ok) await parseError(res)
  return res.json() as Promise<T>
}

async function postJSON<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  } catch (e) {
    throw new Error(friendlyError(e))
  }
  if (!res.ok) await parseError(res)
  return res.json() as Promise<T>
}

export async function getHealth(): Promise<{ ok: boolean }> {
  return getJSON('/api/health')
}

export async function getCurrentRace(): Promise<{ race: RaceDTO; pools: MarketPool[] }> {
  return getJSON('/api/races/current')
}

export async function getUpcomingRaces(): Promise<{ races: RaceDTO[] }> {
  return getJSON('/api/races/upcoming')
}

export async function getRaces(): Promise<{ races: RaceDTO[] }> {
  return getJSON('/api/races')
}

export async function getRace(id: string): Promise<{ race: RaceDTO; pools: MarketPool[] }> {
  return getJSON(`/api/races/${encodeURIComponent(id)}`)
}

export async function getRacePools(
  id: string,
): Promise<{ raceId: string; pools: MarketPool[] }> {
  return getJSON(`/api/races/${encodeURIComponent(id)}/pools`)
}

export async function getRaceResults(
  id: string,
): Promise<{ raceId: string; result: RaceResultDTO | null; status: string }> {
  return getJSON(`/api/races/${encodeURIComponent(id)}/results`)
}

export async function getMyBets(): Promise<{ bets: BetDTO[] }> {
  return getJSON('/api/player/bets')
}

export async function getBalance(): Promise<BalanceResponse> {
  return getJSON('/api/balance')
}

export async function placeBet(body: {
  raceId: string
  horseId: string
  market: string
  stake: number
  idempotencyKey?: string
}): Promise<PlaceBetResponse> {
  return postJSON(
    '/api/bets',
    body,
    body.idempotencyKey ? { 'Idempotency-Key': body.idempotencyKey } : undefined,
  )
}

/** Recent settled races with results — derived from race list. */
export async function getRecentResults(limit = 10): Promise<RaceDTO[]> {
  const { races } = await getRaces()
  return races
    .filter((r) => r.result && (r.status === 'SETTLED' || r.status === 'FINISHED'))
    .sort((a, b) => b.raceNumber - a.raceNumber)
    .slice(0, limit)
}

export async function resetDemo(): Promise<{ ok: boolean; balance: number }> {
  return postJSON('/api/demo/reset', {})
}
