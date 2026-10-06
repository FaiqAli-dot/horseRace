import { getWsURL } from './api'
import type { RealtimeEventName, RealtimeMessage } from './types'

export type RealtimeHandler = (msg: RealtimeMessage) => void

const INTERESTING: Set<string> = new Set([
  'race.created',
  'race.betting_open',
  'pool.updated',
  'bet.accepted',
  'race.locked',
  'race.started',
  'race.result',
  'bet.settled',
  'race.finished',
  'demo.reset',
])

export function isRealtimeEvent(name: string): name is RealtimeEventName {
  return INTERESTING.has(name)
}

/**
 * WebSocket client for live race / pool / bet events.
 * Reconnects with backoff; never fabricates race results.
 */
export function connectRealtime(opts: {
  onMessage: RealtimeHandler
  onOpen?: () => void
  onClose?: () => void
  onError?: (err: Event) => void
}): () => void {
  let ws: WebSocket | null = null
  let alive = true
  let retry: ReturnType<typeof setTimeout> | undefined
  let attempt = 0

  const schedule = () => {
    if (!alive) return
    const delay = Math.min(8000, 800 + attempt * 700)
    attempt += 1
    retry = setTimeout(connect, delay)
  }

  const connect = () => {
    if (!alive) return
    try {
      ws = new WebSocket(getWsURL())
    } catch {
      schedule()
      return
    }

    ws.onopen = () => {
      attempt = 0
      opts.onOpen?.()
    }
    ws.onclose = () => {
      opts.onClose?.()
      schedule()
    }
    ws.onerror = (ev) => {
      opts.onError?.(ev)
    }
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as RealtimeMessage
        if (msg?.event) opts.onMessage(msg)
      } catch {
        /* ignore malformed */
      }
    }
  }

  connect()

  return () => {
    alive = false
    if (retry) clearTimeout(retry)
    ws?.close()
    ws = null
  }
}
