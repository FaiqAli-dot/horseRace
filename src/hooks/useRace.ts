import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { getHorseById } from '../data/horses'
import {
  getHorseProgress,
  getPlaceForHorse,
  runMockRace,
} from '../game/mockRaceEngine'
import { calculatePayout } from '../game/payout'
import type {
  BetSlip,
  FinishPlace,
  GameState,
  HistoryEntry,
  PayoutBreakdown,
  RaceAnimationPlan,
  RaceResult,
} from '../game/raceTypes'

const STARTING_BALANCE = 1000
const COUNTDOWN_STEPS = ['READY', '3', '2', '1', 'GO!'] as const
/** Hold on the finish line with confetti / podium before the result modal. */
const FINISH_MOMENT_MS = 2000
/** React place/progress publish rate — keeps mobile paints light. */
const PROGRESS_PUBLISH_MS = 50
/**
 * If the tab was backgrounded longer than this, don't skip the race —
 * freeze elapsed and continue smoothly when visible again.
 */
const BACKGROUND_GAP_MS = 250

export type CountdownLabel = (typeof COUNTDOWN_STEPS)[number] | null
export type FinishIntensity = 'win' | 'podium' | 'loss'

export interface RaceProgress {
  [horseId: string]: number
}

export interface UseRaceReturn {
  gameState: GameState
  balance: number
  selectedHorseId: string | null
  betAmount: number
  customBet: string
  countdownLabel: CountdownLabel
  raceProgress: RaceProgress
  /** Imperative progress mirror — RaceTrack reads this every frame for transforms. */
  progressRef: MutableRefObject<RaceProgress>
  result: RaceResult | null
  animationPlan: RaceAnimationPlan | null
  payout: PayoutBreakdown | null
  history: HistoryEntry[]
  photoFinish: boolean
  showPhotoFinishOverlay: boolean
  showFinishMoment: boolean
  finishIntensity: FinishIntensity | null
  selectedPlace: FinishPlace | null
  lockedBet: BetSlip | null
  selectHorse: (horseId: string) => void
  setBetQuick: (amount: number) => void
  setCustomBet: (value: string) => void
  placeBet: () => void
  raceAgain: () => void
  canPlaceBet: boolean
  isInteractionLocked: boolean
}

function parseBet(customBet: string, betAmount: number): number {
  if (customBet.trim() !== '') {
    const parsed = Number.parseFloat(customBet)
    if (Number.isFinite(parsed)) return Math.round(parsed * 100) / 100
  }
  return betAmount
}

export function useRace(): UseRaceReturn {
  const [gameState, setGameState] = useState<GameState>('idle')
  const [balance, setBalance] = useState(STARTING_BALANCE)
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null)
  const [betAmount, setBetAmount] = useState(1)
  const [customBet, setCustomBetState] = useState('')
  const [countdownLabel, setCountdownLabel] = useState<CountdownLabel>(null)
  const [raceProgress, setRaceProgress] = useState<RaceProgress>({})
  const [result, setResult] = useState<RaceResult | null>(null)
  const [animationPlan, setAnimationPlan] = useState<RaceAnimationPlan | null>(
    null,
  )
  const [payout, setPayout] = useState<PayoutBreakdown | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [photoFinish, setPhotoFinish] = useState(false)
  const [showPhotoFinishOverlay, setShowPhotoFinishOverlay] = useState(false)
  const [showFinishMoment, setShowFinishMoment] = useState(false)
  const [finishIntensity, setFinishIntensity] = useState<FinishIntensity | null>(
    null,
  )
  const [selectedPlace, setSelectedPlace] = useState<FinishPlace | null>(null)
  const [lockedBet, setLockedBet] = useState<BetSlip | null>(null)

  const animationRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const finishTimerRef = useRef<number | null>(null)
  const planRef = useRef<RaceAnimationPlan | null>(null)
  const resultRef = useRef<RaceResult | null>(null)
  const lockedBetRef = useRef<BetSlip | null>(null)
  const selectedPlaceRef = useRef<FinishPlace | null>(null)
  const payoutRef = useRef<PayoutBreakdown | null>(null)
  const progressRef = useRef<RaceProgress>({})
  const raceDoneRef = useRef(false)
  const elapsedRef = useRef(0)
  const lastTickRef = useRef(0)
  const lastPublishRef = useRef(0)

  const isInteractionLocked =
    gameState === 'countdown' ||
    gameState === 'racing' ||
    gameState === 'finished' ||
    showFinishMoment

  const effectiveBet = parseBet(customBet, betAmount)
  const canPlaceBet =
    !isInteractionLocked &&
    selectedHorseId !== null &&
    Number.isFinite(effectiveBet) &&
    effectiveBet >= 0.1 &&
    effectiveBet <= balance

  const stopRaceLoop = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const selectHorse = useCallback(
    (horseId: string) => {
      if (isInteractionLocked) return
      setSelectedHorseId(horseId)
      setGameState('betting')
    },
    [isInteractionLocked],
  )

  const setBetQuick = useCallback(
    (amount: number) => {
      if (isInteractionLocked) return
      setBetAmount(amount)
      setCustomBetState('')
    },
    [isInteractionLocked],
  )

  const setCustomBet = useCallback(
    (value: string) => {
      if (isInteractionLocked) return
      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
        setCustomBetState(value)
      }
    },
    [isInteractionLocked],
  )

  const revealResult = useCallback(() => {
    const plan = planRef.current
    const place = selectedPlaceRef.current
    const breakdown = payoutRef.current

    const shouldPhoto =
      Boolean(plan?.photoFinish) &&
      place !== null &&
      place <= 3 &&
      Boolean(breakdown?.isWin)

    if (shouldPhoto) {
      setShowPhotoFinishOverlay(true)
      window.setTimeout(() => {
        setShowPhotoFinishOverlay(false)
        setGameState('finished')
      }, 1600)
    } else {
      setGameState('finished')
    }
  }, [])

  const settleAndCelebrate = useCallback(() => {
    if (raceDoneRef.current) return
    raceDoneRef.current = true
    stopRaceLoop()

    const raceResult = resultRef.current
    const bet = lockedBetRef.current
    const plan = planRef.current
    if (!raceResult || !bet || !plan) return

    const horse = getHorseById(bet.horseId)
    if (!horse) return

    const place = getPlaceForHorse(raceResult, bet.horseId)
    const breakdown = calculatePayout(horse, place, bet.amount)

    const snapped: RaceProgress = {}
    raceResult.positions.forEach((id, index) => {
      snapped[id] = 1 - index * 0.018
    })
    progressRef.current = snapped
    setRaceProgress(snapped)

    setSelectedPlace(place)
    setPayout(breakdown)
    selectedPlaceRef.current = place
    payoutRef.current = breakdown
    setBalance((prev) => Math.round((prev + breakdown.payout) * 100) / 100)

    const intensity: FinishIntensity = !breakdown.isWin
      ? 'loss'
      : place === 1
        ? 'win'
        : 'podium'
    setFinishIntensity(intensity)
    setShowFinishMoment(true)

    const entry: HistoryEntry = {
      id: `${raceResult.raceId}-${bet.horseId}`,
      raceId: raceResult.raceId,
      horseId: bet.horseId,
      horseName: horse.name,
      place,
      betAmount: bet.amount,
      payout: breakdown.payout,
      profit: breakdown.profit,
      timestamp: Date.now(),
    }
    setHistory((prev) => [entry, ...prev].slice(0, 20))

    if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current)
    finishTimerRef.current = window.setTimeout(() => {
      revealResult()
    }, FINISH_MOMENT_MS)
  }, [revealResult, stopRaceLoop])

  const startRacing = useCallback(() => {
    const plan = planRef.current
    if (!plan) return

    stopRaceLoop()
    raceDoneRef.current = false
    elapsedRef.current = 0
    lastTickRef.current = performance.now()
    lastPublishRef.current = 0

    setGameState('racing')
    setCountdownLabel(null)
    setShowFinishMoment(false)
    setFinishIntensity(null)

    const horseIds = Object.keys(plan.finishTimesMs)
    const initial: RaceProgress = {}
    for (const id of horseIds) initial[id] = 0
    progressRef.current = initial
    setRaceProgress(initial)

    const publish = (next: RaceProgress, force = false) => {
      const now = performance.now()
      if (!force && now - lastPublishRef.current < PROGRESS_PUBLISH_MS) return
      lastPublishRef.current = now
      setRaceProgress({ ...next })
    }

    const step = () => {
      if (raceDoneRef.current) return

      const now = performance.now()
      let dt = now - lastTickRef.current
      lastTickRef.current = now

      // Background / Safari throttle gap: don't teleport to the finish.
      if (dt > BACKGROUND_GAP_MS) {
        dt = 1000 / 60
      }
      dt = Math.max(0, Math.min(dt, 50))

      elapsedRef.current = Math.min(
        elapsedRef.current + dt,
        plan.durationMs,
      )
      const elapsed = elapsedRef.current

      const next: RaceProgress = {}
      for (const id of horseIds) {
        next[id] = getHorseProgress(elapsed, id, plan)
      }
      progressRef.current = next
      publish(next, elapsed >= plan.durationMs)

      if (elapsed >= plan.durationMs) {
        settleAndCelebrate()
      }
    }

    // rAF for smooth displays; interval only kicks in if rAF stalls (iOS Safari).
    const rafLoop = () => {
      step()
      if (!raceDoneRef.current) {
        animationRef.current = requestAnimationFrame(rafLoop)
      }
    }
    animationRef.current = requestAnimationFrame(rafLoop)
    intervalRef.current = window.setInterval(() => {
      if (raceDoneRef.current) return
      if (performance.now() - lastTickRef.current > 80) {
        step()
      }
    }, 50)
  }, [settleAndCelebrate, stopRaceLoop])

  const placeBet = useCallback(() => {
    if (!canPlaceBet || !selectedHorseId) return

    const amount = effectiveBet
    const bet: BetSlip = { horseId: selectedHorseId, amount }
    lockedBetRef.current = bet
    setLockedBet(bet)
    setBalance((prev) => Math.round((prev - amount) * 100) / 100)

    const { result: raceResult, animation } = runMockRace()
    resultRef.current = raceResult
    planRef.current = animation
    setResult(raceResult)
    setAnimationPlan(animation)
    setPhotoFinish(animation.photoFinish)
    setPayout(null)
    setSelectedPlace(null)
    selectedPlaceRef.current = null
    payoutRef.current = null
    setShowPhotoFinishOverlay(false)
    setShowFinishMoment(false)
    setFinishIntensity(null)
    raceDoneRef.current = false
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current)
      finishTimerRef.current = null
    }
    stopRaceLoop()

    const initial: RaceProgress = {}
    for (const id of Object.keys(animation.finishTimesMs)) {
      initial[id] = 0
    }
    progressRef.current = initial
    setRaceProgress(initial)

    setGameState('countdown')
    let step = 0
    setCountdownLabel(COUNTDOWN_STEPS[0])

    const advance = () => {
      step += 1
      if (step >= COUNTDOWN_STEPS.length) {
        startRacing()
        return
      }
      setCountdownLabel(COUNTDOWN_STEPS[step])
      window.setTimeout(advance, step === COUNTDOWN_STEPS.length - 1 ? 700 : 750)
    }

    window.setTimeout(advance, 800)
  }, [canPlaceBet, selectedHorseId, effectiveBet, startRacing, stopRaceLoop])

  const raceAgain = useCallback(() => {
    if (gameState !== 'finished') return
    stopRaceLoop()
    if (finishTimerRef.current) {
      window.clearTimeout(finishTimerRef.current)
      finishTimerRef.current = null
    }
    resultRef.current = null
    planRef.current = null
    lockedBetRef.current = null
    selectedPlaceRef.current = null
    payoutRef.current = null
    progressRef.current = {}
    raceDoneRef.current = false
    setLockedBet(null)
    setResult(null)
    setAnimationPlan(null)
    setPayout(null)
    setSelectedPlace(null)
    setCountdownLabel(null)
    setPhotoFinish(false)
    setShowPhotoFinishOverlay(false)
    setShowFinishMoment(false)
    setFinishIntensity(null)
    setRaceProgress({})
    setGameState('betting')
  }, [gameState, stopRaceLoop])

  useEffect(() => {
    return () => {
      stopRaceLoop()
      if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current)
    }
  }, [stopRaceLoop])

  return {
    gameState,
    balance,
    selectedHorseId,
    betAmount,
    customBet,
    countdownLabel,
    raceProgress,
    progressRef,
    result,
    animationPlan,
    payout,
    history,
    photoFinish,
    showPhotoFinishOverlay,
    showFinishMoment,
    finishIntensity,
    selectedPlace,
    lockedBet,
    selectHorse,
    setBetQuick,
    setCustomBet,
    placeBet,
    raceAgain,
    canPlaceBet,
    isInteractionLocked,
  }
}
