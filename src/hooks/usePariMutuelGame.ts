import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import {
  getBalance,
  getCurrentRace,
  getMyBets,
  getRace,
  getRacePools,
  getRecentResults,
  getUpcomingRaces,
  placeBet as apiPlaceBet,
  resetDemo,
} from '../services/api'
import { friendlyError } from '../services/errors'
import { connectRealtime } from '../services/realtime'
import type {
  BetDTO,
  Market,
  MarketPool,
  PlaceBetResponse,
  RaceDTO,
  RaceResultDTO,
} from '../services/types'
import { getHorseProgress, planFromBackendResult } from '../game/raceAnimation'
import type { CountdownLabel, FinishIntensity, RaceProgress } from '../game/raceTypes'
import { HORSES } from '../data/horses'

function bettingAllows(status?: string): boolean {
  return status === 'BETTING_OPEN' || status === 'SCHEDULED'
}

function poolsLocked(status?: string): boolean {
  return (
    status === 'LOCKED' ||
    status === 'RACING' ||
    status === 'FINISHED' ||
    status === 'SETTLED'
  )
}

export function usePariMutuelGame() {
  const [currentRace, setCurrentRace] = useState<RaceDTO | null>(null)
  const [selectedRace, setSelectedRace] = useState<RaceDTO | null>(null)
  const [pools, setPools] = useState<MarketPool[]>([])
  const [frozenPools, setFrozenPools] = useState<MarketPool[] | null>(null)
  const [upcoming, setUpcoming] = useState<RaceDTO[]>([])
  const [recentResults, setRecentResults] = useState<RaceDTO[]>([])
  const [balance, setBalance] = useState(0)
  const [bets, setBets] = useState<BetDTO[]>([])
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null)
  const [market, setMarket] = useState<Market>('WIN')
  const [betAmount, setBetAmount] = useState(1)
  const [customBet, setCustomBetState] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [acceptedBet, setAcceptedBet] = useState<PlaceBetResponse | null>(null)
  const [connected, setConnected] = useState(false)
  const [backendOk, setBackendOk] = useState(false)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [slipOpen, setSlipOpen] = useState(false)

  const [raceProgress, setRaceProgress] = useState<RaceProgress>({})
  const progressRef = useRef<RaceProgress>({}) as MutableRefObject<RaceProgress>
  const [showFinishMoment, setShowFinishMoment] = useState(false)
  const [finishIntensity, setFinishIntensity] = useState<FinishIntensity | null>(null)
  const [visualResult, setVisualResult] = useState<RaceResultDTO | null>(null)
  const [resultsByRaceId, setResultsByRaceId] = useState<Record<string, RaceResultDTO>>({})
  const [countdownLabel, setCountdownLabel] = useState<CountdownLabel>(null)
  const [phaseBanner, setPhaseBanner] = useState<string | null>(null)

  const animRaceIdRef = useRef<string | null>(null)
  const resultsCacheRef = useRef<Record<string, RaceResultDTO>>({})
  const frozenForRaceRef = useRef<string | null>(null)
  const selectedRaceIdRef = useRef<string | null>(null)

  const rememberResult = useCallback((result: RaceResultDTO | null | undefined) => {
    if (!result?.raceId || !result.positions?.length) return
    if (resultsCacheRef.current[result.raceId]) return
    resultsCacheRef.current = { ...resultsCacheRef.current, [result.raceId]: result }
    setResultsByRaceId(resultsCacheRef.current)
  }, [])

  const applyPools = useCallback(
    (race: RaceDTO, nextPools: MarketPool[]) => {
      if (poolsLocked(race.status)) {
        if (frozenForRaceRef.current !== race.id) {
          frozenForRaceRef.current = race.id
          setFrozenPools(nextPools)
        }
        setPools(nextPools)
      } else {
        frozenForRaceRef.current = null
        setFrozenPools(null)
        setPools(nextPools)
      }
    },
    [],
  )

  const displayPools = frozenPools ?? pools

  const refresh = useCallback(async () => {
    try {
      const [cur, up, bal, pb, recent] = await Promise.all([
        getCurrentRace(),
        getUpcomingRaces(),
        getBalance(),
        getMyBets(),
        getRecentResults(10),
      ])
      setCurrentRace(cur.race)
      setUpcoming(up.races)
      setBalance(bal.balance)
      setBets(pb.bets)
      setRecentResults(recent)
      rememberResult(cur.race.result)

      const selId = selectedRaceIdRef.current
      let focus = cur.race
      if (selId && selId !== cur.race.id) {
        const stillOpen = up.races.find((r) => r.id === selId && bettingAllows(r.status))
        if (stillOpen) {
          try {
            const detail = await getRace(selId)
            focus = detail.race
            applyPools(detail.race, detail.pools)
            setSelectedRace(detail.race)
            rememberResult(detail.race.result)
          } catch {
            focus = cur.race
            applyPools(cur.race, cur.pools)
            setSelectedRace(cur.race)
            selectedRaceIdRef.current = cur.race.id
          }
        } else if (selId === cur.race.id || !bettingAllows(cur.race.status)) {
          applyPools(cur.race, cur.pools)
          setSelectedRace(cur.race)
          selectedRaceIdRef.current = cur.race.id
        } else {
          applyPools(cur.race, cur.pools)
          setSelectedRace(cur.race)
          selectedRaceIdRef.current = cur.race.id
        }
      } else {
        applyPools(cur.race, cur.pools)
        setSelectedRace(cur.race)
        selectedRaceIdRef.current = cur.race.id
      }

      // Keep selected race in sync when watching current
      if (selectedRaceIdRef.current === cur.race.id) {
        setSelectedRace(cur.race)
        applyPools(cur.race, cur.pools)
      }

      const missing = [
        ...new Set(
          pb.bets
            .map((b) => b.raceId)
            .filter((id) => id && !resultsCacheRef.current[id]),
        ),
      ]
      await Promise.all(
        missing.slice(0, 8).map(async (id) => {
          try {
            const detail = await getRace(id)
            rememberResult(detail.race.result)
          } catch {
            /* open race */
          }
        }),
      )

      setBackendOk(true)
      setError((prev) => (prev?.includes('BACKEND OFFLINE') ? null : prev))
      void focus
    } catch (e) {
      setBackendOk(false)
      setError(friendlyError(e))
    }
  }, [applyPools, rememberResult])

  // Clock for countdowns
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 2500)
    return () => clearInterval(id)
  }, [refresh])

  useEffect(() => {
    return connectRealtime({
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (msg) => {
        if (msg.event === 'pool.updated' && selectedRaceIdRef.current) {
          const payload = msg.payload as { raceId?: string; pools?: MarketPool[] }
          if (
            payload?.raceId === selectedRaceIdRef.current &&
            payload.pools &&
            !poolsLocked(
              selectedRaceIdRef.current === currentRace?.id
                ? currentRace?.status
                : selectedRace?.status,
            )
          ) {
            setPools(payload.pools)
          }
        }
        void refresh()
      },
    })
  }, [refresh, currentRace?.id, currentRace?.status, selectedRace?.status])

  // Status banners + visual countdown for CURRENT race lifecycle
  useEffect(() => {
    const race = currentRace
    if (!race) {
      setPhaseBanner(null)
      setCountdownLabel(null)
      return
    }
    if (race.status === 'LOCKED') {
      setPhaseBanner('🔒 BETTING LOCKED')
      setCountdownLabel('READY')
      return
    }
    if (race.status === 'RACING') {
      setPhaseBanner(
        showFinishMoment ? '🏁 FINISH' : '🏁 RACE STARTING…',
      )
      if (!showFinishMoment && Object.values(progressRef.current).every((p) => !p)) {
        setCountdownLabel('GO!')
      } else {
        setCountdownLabel(null)
      }
      return
    }
    if (race.status === 'FINISHED' || race.status === 'SETTLED') {
      setPhaseBanner('RESULT')
      setCountdownLabel(null)
      return
    }
    if (race.status === 'BETTING_OPEN') {
      setPhaseBanner('BETTING OPEN')
      setCountdownLabel(null)
      return
    }
    setPhaseBanner(race.status)
    setCountdownLabel(null)
  }, [currentRace, showFinishMoment])

  // Animate CURRENT race from backend result only
  useEffect(() => {
    const race = currentRace
    if (!race) return
    const result = race.result
    rememberResult(result)

    if (race.status === 'RACING' && result && animRaceIdRef.current !== race.id) {
      animRaceIdRef.current = race.id
      setVisualResult(result)
      setShowFinishMoment(false)
      setFinishIntensity(null)
      const plan = planFromBackendResult(result)
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
          const snapped: RaceProgress = {}
          result.positions.forEach((id, i) => {
            snapped[id] = 1 - i * 0.018
          })
          progressRef.current = snapped
          setRaceProgress(snapped)
          setShowFinishMoment(true)
          const mine = bets.filter((b) => b.raceId === race.id)
          const won = mine.some(
            (b) =>
              b.settlementStatus === 'SETTLED' && b.payoutCents > b.stakeCents,
          )
          const placed = result.positions.slice(0, 3)
          const myHorsePlaced = mine.some((b) => placed.includes(b.horseId))
          setFinishIntensity(won ? 'win' : myHorsePlaced ? 'podium' : mine.length ? 'loss' : null)
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
      for (const h of HORSES) zero[h.id] = 0
      progressRef.current = zero
      setRaceProgress(zero)
    }
  }, [currentRace, bets, rememberResult])

  const selectRace = useCallback(
    async (race: RaceDTO) => {
      selectedRaceIdRef.current = race.id
      setSelectedRace(race)
      setError(null)
      setAcceptedBet(null)
      try {
        const detail = await getRace(race.id)
        setSelectedRace(detail.race)
        applyPools(detail.race, detail.pools)
        rememberResult(detail.race.result)
      } catch (e) {
        setError(friendlyError(e))
      }
    },
    [applyPools, rememberResult],
  )

  const effectiveBet = useMemo(() => {
    if (customBet.trim() !== '') {
      const n = Number.parseFloat(customBet)
      if (Number.isFinite(n)) return Math.round(n * 100) / 100
    }
    return betAmount
  }, [customBet, betAmount])

  const bettingOpen = bettingAllows(selectedRace?.status)
  const isLockedView = poolsLocked(selectedRace?.status)

  const canPlaceBet =
    backendOk &&
    !!selectedRace &&
    bettingOpen &&
    !!selectedHorseId &&
    effectiveBet >= 0.1 &&
    effectiveBet <= balance

  const placeBet = useCallback(async () => {
    if (!selectedRace || !selectedHorseId) {
      setError('Select a horse and race first.')
      return
    }
    if (!bettingOpen) {
      setError('Betting is locked for this race. Pick an open upcoming race.')
      return
    }
    if (effectiveBet < 0.1) {
      setError('Invalid stake — enter an amount greater than $0.')
      return
    }
    if (effectiveBet > balance) {
      setError('Insufficient balance for that stake.')
      return
    }
    setError(null)
    setInfo(null)
    try {
      // Re-check race status before submit
      const fresh = await getRace(selectedRace.id)
      if (!bettingAllows(fresh.race.status)) {
        setError('Race state changed — betting just closed. Try the next open race.')
        setSelectedRace(fresh.race)
        applyPools(fresh.race, fresh.pools)
        return
      }
      const res = await apiPlaceBet({
        raceId: selectedRace.id,
        horseId: selectedHorseId,
        market,
        stake: effectiveBet,
        idempotencyKey: crypto.randomUUID(),
      })
      setBalance(res.balance)
      setAcceptedBet(res)
      setInfo('BET ACCEPTED')
      setSlipOpen(false)
      await refresh()
      // Refresh pools for selected race
      try {
        const p = await getRacePools(selectedRace.id)
        if (!poolsLocked(fresh.race.status)) setPools(p.pools)
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(friendlyError(e))
    }
  }, [
    selectedRace,
    selectedHorseId,
    bettingOpen,
    effectiveBet,
    balance,
    market,
    applyPools,
    refresh,
  ])

  const setCustomBet = useCallback((value: string) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) setCustomBetState(value)
  }, [])

  const dividendFor = useCallback(
    (horseId: string, m: Market = market) => {
      const mp = displayPools.find((p) => p.market === m)
      const slice = mp?.perHorse.find((h) => h.horseId === horseId)
      return slice?.estimatedDividend ?? 0
    },
    [displayPools, market],
  )

  const bettingClosesInSec = useMemo(() => {
    const race = selectedRace
    if (!race || !bettingAllows(race.status)) return null
    const close = new Date(race.bettingCloseAt).getTime()
    return Math.max(0, Math.ceil((close - nowMs) / 1000))
  }, [selectedRace, nowMs])

  const currentClosesInSec = useMemo(() => {
    const race = currentRace
    if (!race || race.status !== 'BETTING_OPEN') return null
    const close = new Date(race.bettingCloseAt).getTime()
    return Math.max(0, Math.ceil((close - nowMs) / 1000))
  }, [currentRace, nowMs])

  const isRacing = currentRace?.status === 'RACING' && !showFinishMoment

  return {
    currentRace,
    selectedRace,
    selectRace,
    pools: displayPools,
    livePools: pools,
    upcoming,
    recentResults,
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
    setError,
    info,
    acceptedBet,
    clearAccepted: () => setAcceptedBet(null),
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
    isLockedView,
    dividendFor,
    bettingClosesInSec,
    currentClosesInSec,
    countdownLabel,
    phaseBanner,
    slipOpen,
    setSlipOpen,
    refresh,
    resetDemo: async () => {
      try {
        await resetDemo()
        setAcceptedBet(null)
        setError(null)
        await refresh()
      } catch (e) {
        setError(friendlyError(e))
      }
    },
  }
}
