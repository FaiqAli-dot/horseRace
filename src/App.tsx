import { useEffect, useMemo, useRef, useState } from 'react'
import { BetSlip } from './components/BetSlip'
import { Header } from './components/Header'
import { MyBets } from './components/MyBets'
import { PoolTable } from './components/PoolTable'
import { RaceStatusBar } from './components/RaceStatusBar'
import { RaceTrack } from './components/RaceTrack'
import { RecentResults } from './components/RecentResults'
import { ResultOverlay } from './components/ResultOverlay'
import { TotalPoolBanner } from './components/TotalPoolBanner'
import { UpcomingRaces } from './components/UpcomingRaces'
import { usePariMutuelGame } from './hooks/usePariMutuelGame'
import type { RaceResult } from './game/raceTypes'

export default function App() {
  const g = usePariMutuelGame()
  const trackRef = useRef<HTMLDivElement>(null)
  const [resultDismissed, setResultDismissed] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (g.currentRace?.status === 'RACING' || g.currentRace?.status === 'BETTING_OPEN') {
      trackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [g.currentRace?.status])

  const localResult: RaceResult | null = g.visualResult
    ? {
        raceId: g.visualResult.raceId,
        positions: g.visualResult.positions,
        winner: g.visualResult.winner,
        second: g.visualResult.second,
        third: g.visualResult.third,
      }
    : null

  const showResultModal =
    (g.currentRace?.status === 'SETTLED' || g.currentRace?.status === 'FINISHED') &&
    !g.showFinishMoment &&
    resultDismissed !== g.currentRace?.id

  const raceNumbers = useMemo(() => {
    const map: Record<string, number> = {}
    if (g.currentRace) map[g.currentRace.id] = g.currentRace.raceNumber
    for (const r of g.upcoming) map[r.id] = r.raceNumber
    for (const r of g.recentResults) map[r.id] = r.raceNumber
    return map
  }, [g.currentRace, g.upcoming, g.recentResults])

  const slipProps = {
    race: g.selectedRace,
    horseId: g.selectedHorseId,
    market: g.market,
    stake: g.effectiveBet,
    customBet: g.customBet,
    dividend: g.selectedHorseId ? g.dividendFor(g.selectedHorseId) : 0,
    locked: !g.bettingOpen,
    canPlaceBet: g.canPlaceBet,
    onMarketChange: g.setMarket,
    onQuickSelect: (n: number) => {
      g.setBetAmount(n)
      g.setCustomBet('')
    },
    onCustomChange: g.setCustomBet,
    onPlaceBet: () => void g.placeBet(),
    accepted: g.acceptedBet,
    onClearAccepted: g.clearAccepted,
  }

  return (
    <div className="app-shell min-h-dvh text-cream">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
        <Header balance={g.balance} onReset={() => void g.resetDemo()} />

        <RaceStatusBar
          race={g.currentRace}
          phaseBanner={g.phaseBanner}
          closesInSec={g.currentClosesInSec}
          connected={g.connected}
          backendOk={g.backendOk}
        />

        {(g.error || g.info) && (
          <div className="mx-4 mt-2 space-y-1 sm:mx-6">
            {g.error && (
              <p className="rounded-xl border border-rose-400/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
                {g.error}
              </p>
            )}
            {g.info && !g.error && (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
                {g.info}
              </p>
            )}
          </div>
        )}

        <main className="flex flex-1 flex-col gap-4 pb-28 pt-3 sm:gap-5 sm:pb-10">
          <div ref={trackRef}>
            <RaceTrack
              progress={g.raceProgress}
              progressRef={g.progressRef}
              selectedHorseId={g.selectedHorseId}
              isRacing={g.isRacing}
              countdownLabel={g.countdownLabel}
              result={localResult}
              showFinishMoment={g.showFinishMoment}
              confettiActive={g.showFinishMoment && g.currentRace?.status === 'RACING'}
              finishIntensity={g.finishIntensity}
            />
          </div>

          <TotalPoolBanner
            pools={g.pools}
            locked={g.isLockedView}
            takeoutRate={g.selectedRace?.takeoutRate}
          />

          {/* Desktop: pools + slip | sidebar */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] lg:items-start">
            <div className="space-y-4">
              <PoolTable
                pools={g.pools}
                locked={g.isLockedView}
                selectedHorseId={g.selectedHorseId}
                selectedMarket={g.market}
                disabled={!g.backendOk || !g.bettingOpen}
                onSelect={(horseId, market) => {
                  g.setSelectedHorseId(horseId)
                  g.setMarket(market)
                  if (isMobile) g.setSlipOpen(true)
                }}
              />

              {/* Desktop bet slip */}
              <div className="hidden px-4 sm:px-6 lg:block">
                <BetSlip
                  {...slipProps}
                  mobileSheet={false}
                  open
                  onClose={() => undefined}
                />
              </div>
            </div>

            <aside className="space-y-5 px-4 sm:px-6">
              <UpcomingRaces
                current={g.currentRace}
                upcoming={g.upcoming}
                selectedId={g.selectedRace?.id ?? null}
                onSelect={(r) => void g.selectRace(r)}
              />
              <MyBets
                bets={g.bets}
                resultsByRaceId={g.resultsByRaceId}
                raceNumbers={raceNumbers}
              />
              <RecentResults races={g.recentResults} />
            </aside>
          </div>
        </main>

        {/* Mobile sticky CTA */}
        {isMobile && g.backendOk && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
            <button
              type="button"
              onClick={() => g.setSlipOpen(true)}
              className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-gold-dim via-gold to-gold-light font-display text-base font-bold text-ink"
            >
              {g.bettingOpen
                ? 'Open bet slip'
                : 'Bet slip · pick an open race'}
            </button>
          </div>
        )}

        <BetSlip
          {...slipProps}
          mobileSheet
          open={g.slipOpen}
          onClose={() => g.setSlipOpen(false)}
        />
      </div>

      <ResultOverlay
        open={Boolean(showResultModal)}
        race={g.currentRace}
        myBets={g.bets}
        onDismiss={() => {
          if (g.currentRace) setResultDismissed(g.currentRace.id)
          void g.refresh()
        }}
      />
    </div>
  )
}
