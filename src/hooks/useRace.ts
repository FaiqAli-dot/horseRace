import { useCallback, useEffect, useRef, useState } from 'react'
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

export type CountdownLabel = (typeof COUNTDOWN_STEPS)[number] | null

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
  result: RaceResult | null
  payout: PayoutBreakdown | null
  history: HistoryEntry[]
  photoFinish: boolean
  showPhotoFinishOverlay: boolean
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
  const [payout, setPayout] = useState<PayoutBreakdown | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [photoFinish, setPhotoFinish] = useState(false)
  const [showPhotoFinishOverlay, setShowPhotoFinishOverlay] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<FinishPlace | null>(null)
  const [lockedBet, setLockedBet] = useState<BetSlip | null>(null)

  const animationRef = useRef<number | null>(null)
  const planRef = useRef<RaceAnimationPlan | null>(null)
  const resultRef = useRef<RaceResult | null>(null)
  const lockedBetRef = useRef<BetSlip | null>(null)

  const isInteractionLocked =
    gameState === 'countdown' || gameState === 'racing' || gameState === 'finished'

  const effectiveBet = parseBet(customBet, betAmount)
  const canPlaceBet =
    !isInteractionLocked &&
    selectedHorseId !== null &&
    Number.isFinite(effectiveBet) &&
    effectiveBet >= 0.1 &&
    effectiveBet <= balance

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
      // Allow digits and one decimal point while typing
      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
        setCustomBetState(value)
      }
    },
    [isInteractionLocked],
  )

  const finishRace = useCallback(() => {
    const raceResult = resultRef.current
    const bet = lockedBetRef.current
    const plan = planRef.current
    if (!raceResult || !bet) return

    const horse = getHorseById(bet.horseId)
    if (!horse) return

    const place = getPlaceForHorse(raceResult, bet.horseId)
    const breakdown = calculatePayout(horse, place, bet.amount)

    setSelectedPlace(place)
    setPayout(breakdown)
    setBalance((prev) => Math.round((prev + breakdown.payout) * 100) / 100)

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

    const shouldPhoto =
      Boolean(plan?.photoFinish) && place <= 3 && breakdown.isWin

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

  const startRacing = useCallback(() => {
    const plan = planRef.current
    if (!plan) return

    setGameState('racing')
    setCountdownLabel(null)

    let simMs = 0
    let lastNow = performance.now()
    const horseIds = Object.keys(plan.finishTimesMs)
    // Cap per-frame advance so background tab throttling cannot skip the race.
    const MAX_FRAME_MS = 48

    const tick = (now: number) => {
      const dt = Math.min(Math.max(0, now - lastNow), MAX_FRAME_MS)
      lastNow = now
      simMs += dt

      const next: RaceProgress = {}
      for (const id of horseIds) {
        next[id] = getHorseProgress(simMs, id, plan)
      }
      setRaceProgress(next)

      if (simMs < plan.durationMs) {
        animationRef.current = requestAnimationFrame(tick)
      } else {
        // Snap to exact finish positions in predetermined order
        const snapped: RaceProgress = {}
        for (const id of horseIds) {
          snapped[id] = 1
        }
        setRaceProgress(snapped)
        finishRace()
      }
    }

    animationRef.current = requestAnimationFrame(tick)
  }, [finishRace])

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
    setPhotoFinish(animation.photoFinish)
    setPayout(null)
    setSelectedPlace(null)
    setShowPhotoFinishOverlay(false)

    // Reset horses to gate
    const initial: RaceProgress = {}
    for (const id of Object.keys(animation.finishTimesMs)) {
      initial[id] = 0
    }
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
  }, [canPlaceBet, selectedHorseId, effectiveBet, startRacing])

  const raceAgain = useCallback(() => {
    if (gameState !== 'finished') return
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    resultRef.current = null
    planRef.current = null
    lockedBetRef.current = null
    setLockedBet(null)
    setResult(null)
    setPayout(null)
    setSelectedPlace(null)
    setCountdownLabel(null)
    setPhotoFinish(false)
    setShowPhotoFinishOverlay(false)
    setRaceProgress({})
    setGameState('betting')
  }, [gameState])

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return {
    gameState,
    balance,
    selectedHorseId,
    betAmount,
    customBet,
    countdownLabel,
    raceProgress,
    result,
    payout,
    history,
    photoFinish,
    showPhotoFinishOverlay,
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
