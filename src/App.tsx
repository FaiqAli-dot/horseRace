import { useEffect, useRef } from 'react'
import { BetSelector } from './components/BetSelector'
import { Header } from './components/Header'
import { HorseSelector } from './components/HorseSelector'
import { PhotoFinish } from './components/PhotoFinish'
import { RaceCountdown } from './components/RaceCountdown'
import { RaceHistory } from './components/RaceHistory'
import { RaceResult } from './components/RaceResult'
import { RaceTrack } from './components/RaceTrack'
import { useRace } from './hooks/useRace'

export default function App() {
  const race = useRace()
  const isRacing = race.gameState === 'racing' && !race.showFinishMoment
  const showResult = race.gameState === 'finished' && race.payout !== null
  const confettiActive =
    race.showFinishMoment && race.gameState !== 'finished' && !race.showPhotoFinishOverlay
  const trackRef = useRef<HTMLDivElement>(null)

  // Only scroll on countdown so smooth-scroll doesn't stall the race rAF on mobile.
  useEffect(() => {
    if (race.gameState === 'countdown') {
      trackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [race.gameState])

  return (
    <div className="app-shell min-h-dvh text-cream">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
        <Header balance={race.balance} />

        <main className="flex flex-1 flex-col gap-4 pb-8 pt-2 sm:gap-5">
          <div ref={trackRef}>
            <RaceTrack
              progress={race.raceProgress}
              progressRef={race.progressRef}
              selectedHorseId={race.selectedHorseId}
              isRacing={isRacing}
              countdownLabel={race.countdownLabel}
              result={race.result}
              showFinishMoment={race.showFinishMoment}
              confettiActive={confettiActive}
              finishIntensity={race.finishIntensity}
            />
          </div>

          <RaceCountdown label={race.countdownLabel} />

          <HorseSelector
            selectedHorseId={race.selectedHorseId}
            disabled={race.isInteractionLocked}
            onSelect={race.selectHorse}
          />

          <BetSelector
            betAmount={race.betAmount}
            customBet={race.customBet}
            disabled={race.isInteractionLocked}
            canPlaceBet={race.canPlaceBet}
            onQuickSelect={race.setBetQuick}
            onCustomChange={race.setCustomBet}
            onPlaceBet={race.placeBet}
          />

          <RaceHistory history={race.history} />
        </main>
      </div>

      <PhotoFinish
        open={race.showPhotoFinishOverlay}
        horseId={race.lockedBet?.horseId ?? race.selectedHorseId}
      />

      <RaceResult
        open={showResult}
        horseId={race.lockedBet?.horseId ?? null}
        payout={race.payout}
        place={race.selectedPlace}
        onRaceAgain={race.raceAgain}
      />
    </div>
  )
}
