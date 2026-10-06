import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import type { BetDTO, Market, MarketPool, RaceDTO, RaceResultDTO } from '../api/types'
import { getHorseProgress } from '../game/mockRaceEngine'
import type { RaceAnimationPlan } from '../game/raceTypes'
import type { RaceProgress } from './useRace'

export type FinishIntensity = 'win' | 'podium' | 'loss'

function planFromResult(result: RaceResultDTO, durationMs = 6800): RaceAnimationPlan {
  const finishTimesMs: Record<string, number> = {}
  const seeds: Record<string, number> = {}
  result.positions.forEach((id, index) => {
    finishTimesMs[id] = 5600 + index * 160
    seeds[id] = index * 97 + 13
  })
  return { finishTimesMs, durationMs, photoFinish: false, seeds }
}

export function useBackendGame() {
  const [race, setRace] = useState<RaceDTO | null>(null)
  const [pools, setPools] = useState<MarketPool[]>([])
  const [upcoming, setUpcoming] = useState<RaceDTO[]>([])
  const [balance, setBalance] = useState(1000)
  const [bets, setBets] = useState<BetDTO[]>([])
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null)
  const [market, setMarket] = useState<Market>('WIN')
  const [betAmount, setBetAmount] = useState(1)
  const [customBet, setCustomBetState] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [backendOk, setBackendOk] = useState(false)

  const [raceProgress, setRaceProgress] = useState<RaceProgress>({})
  const progressRef = useRef<RaceProgress>({})
  const [showFinishMoment, setShowFinishMoment] = useState(false)
  const [finishIntensity, setFinishIntensity] = useState<FinishIntensity | null>(null)
  const [visualResult, setVisualResult] = useState<RaceResultDTO | null>(null)
  const [resultsByRaceId, setResultsByRaceId] = useState<Record<string, RaceResultDTO>>({})
  const animRaceIdRef = useRef<string | null>(null)
  const animDoneRef = useRef(false)
  const resultsCacheRef = useRef<Record<string, RaceResultDTO>>({})

  const rememberResult = useCallback((result: RaceResultDTO | null | undefined) => {
    if (!result?.raceId || !result.positions?.length) return
    if (resultsCacheRef.current[result.raceId]) return
    resultsCacheRef.current = { ...resultsCacheRef.current, [result.raceId]: result }
    setResultsByRaceId(resultsCacheRef.current)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [cur, up, bal, pb] = await Promise.all([
        api.current(),
        api.upcoming(),
        api.balance(),
        api.playerBets(),
      ])
      setRace(cur.race)
      setPools(cur.pools)
      setUpcoming(up.races)
      setBalance(bal.balance)
      setBets(pb.bets)
      rememberResult(cur.race.result)
      const missing = [
        ...new Set(
          pb.bets
            .map((b) => b.raceId)
            .filter((id) => id && !resultsCacheRef.current[id] && id !== cur.race?.id),
        ),
      ]
      if (cur.race?.id && cur.race.result && !resultsCacheRef.current[cur.race.id]) {
        rememberResult(cur.race.result)
      }
      await Promise.all(
        missing.slice(0, 8).map(async (id) => {
          try {
            const detail = await api.race(id)
            rememberResult(detail.race.result)
          } catch {
            /* race may still be open */
          }
        }),
      )
      setBackendOk(true)
      setError(null)
    } catch (e) {
      setBackendOk(false)
      setError(e instanceof Error ? e.message : 'Backend unreachable')
    }
  }, [rememberResult])

  // Initial load + polling fallback
  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(id)
  }, [refresh])

  // WebSocket
  useEffect(() => {
    let ws: WebSocket | null = null
    let alive = true
    let retry: number | undefined

    const connect = () => {
      try {
        ws = new WebSocket(api.wsURL())
      } catch {
        retry = window.setTimeout(connect, 1500)
        return
      }
      ws.onopen = () => {
        if (alive) setConnected(true)
      }
      ws.onclose = () => {
        if (!alive) return
        setConnected(false)
        retry = window.setTimeout(connect, 1500)
      }
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string) as { event: string; payload: unknown }
          if (
            msg.event.startsWith('race.') ||
            msg.event === 'pool.updated' ||
            msg.event === 'bet.accepted' ||
            msg.event === 'bet.settled' ||
            msg.event === 'demo.reset'
          ) {
            void refresh()
          }
        } catch {
          /* ignore */
        }
      }
    }
    connect()
    return () => {
      alive = false
      if (retry) window.clearTimeout(retry)
      ws?.close()
    }
  }, [refresh])

  // Visualize backend result when race is RACING (result already on race object from lock).
  useEffect(() => {
    if (!race) return
    const result = race.result
    rememberResult(result)
    if (race.status === 'RACING' && result && animRaceIdRef.current !== race.id) {
      animRaceIdRef.current = race.id
      animDoneRef.current = false
      setVisualResult(result)
      setShowFinishMoment(false)
      setFinishIntensity(null)
      const plan = planFromResult(result)
      const horseIds = Object.keys(plan.finishTimesMs)
      let elapsed = 0
      let last = performance.now()
      let raf = 0
      const tick = (now: number) => {
        const dt = Math.min(50, Math.max(0, now - last))
        last = now
        elapsed = Math.min(plan.durationMs, elapsed + dt)
        const next: RaceProgress = {}
        for (const id of horseIds) next[id] = getHorseProgress(elapsed, id, plan)
        progressRef.current = next
        setRaceProgress({ ...next })
        if (elapsed < plan.durationMs) {
          raf = requestAnimationFrame(tick)
        } else {
          animDoneRef.current = true
          const snapped: RaceProgress = {}
          result.positions.forEach((id, i) => {
            snapped[id] = 1 - i * 0.018
          })
          progressRef.current = snapped
          setRaceProgress(snapped)
          setShowFinishMoment(true)
          // Intensity from player bets on this race if any
          const mine = bets.filter((b) => b.raceId === race.id)
          const won = mine.some((b) => b.payoutCents > b.stakeCents)
          const placed = result.positions.slice(0, 3)
          const myHorsePlaced = mine.some((b) => placed.includes(b.horseId))
          setFinishIntensity(won ? 'win' : myHorsePlaced ? 'podium' : 'loss')
        }
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
    }
    if (race.status === 'BETTING_OPEN' || race.status === 'SCHEDULED') {
      animRaceIdRef.current = null
      setShowFinishMoment(false)
      setVisualResult(null)
      const zero: RaceProgress = {}
      for (const h of race.horses) zero[h.id] = 0
      progressRef.current = zero
      setRaceProgress(zero)
    }
  }, [race, bets, rememberResult])

  const effectiveBet = useMemo(() => {
    if (customBet.trim() !== '') {
      const n = Number.parseFloat(customBet)
      if (Number.isFinite(n)) return Math.round(n * 100) / 100
    }
    return betAmount
  }, [customBet, betAmount])

  const canPlaceBet =
    backendOk &&
    !!race &&
    (race.status === 'BETTING_OPEN' || race.status === 'SCHEDULED') &&
    !!selectedHorseId &&
    effectiveBet >= 0.1 &&
    effectiveBet <= balance

  const placeBet = useCallback(async () => {
    if (!canPlaceBet || !race || !selectedHorseId) return
    setError(null)
    try {
      const res = await api.placeBet({
        raceId: race.id,
        horseId: selectedHorseId,
        market,
        stake: effectiveBet,
        idempotencyKey: crypto.randomUUID(),
      })
      setBalance(res.balance)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bet failed')
    }
  }, [canPlaceBet, race, selectedHorseId, market, effectiveBet, refresh])

  const setCustomBet = useCallback((value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) setCustomBetState(value)
  }, [])

  const dividendFor = useCallback(
    (horseId: string, m: Market = market) => {
      const mp = pools.find((p) => p.market === m)
      const slice = mp?.perHorse.find((h) => h.horseId === horseId)
      return slice?.estimatedDividend ?? 0
    },
    [pools, market],
  )

  const isRacing = race?.status === 'RACING' && !showFinishMoment
  const bettingOpen = race?.status === 'BETTING_OPEN'

  return {
    race,
    pools,
    upcoming,
    balance,
    bets,
    selectedHorseId,
    setSelectedHorseId,
    market,
    setMarket,
    betAmount,
    setBetAmount,
    customBet,
    setCustomBet,
    placeBet,
    canPlaceBet,
    effectiveBet,
    error,
    connected,
    backendOk,
    raceProgress,
    progressRef,
    isRacing,
    showFinishMoment,
    finishIntensity,
    visualResult,
    resultsByRaceId,
    bettingOpen,
    dividendFor,
    refresh,
    resetDemo: async () => {
      await api.reset()
      await refresh()
    },
  }
}
