import { useEffect, useRef, useState } from 'react'
import { BetSelector } from './components/BetSelector'
import { Header } from './components/Header'
import { HorseSelector } from './components/HorseSelector'
import { RaceCountdown } from './components/RaceCountdown'
import { RaceHistory } from './components/RaceHistory'
import { RaceResult } from './components/RaceResult'
import { RaceTrack } from './components/RaceTrack'
import { getHorseById } from './data/horses'
import { useBackendGame } from './hooks/useBackendGame'
import type { FinishPlace, PayoutBreakdown } from './game/raceTypes'
import type { RaceResult as LocalRaceResult } from './game/raceTypes'

function statusLabel(status?: string) {
  switch (status) {
    case 'BETTING_OPEN':
      return 'BETTING OPEN'
    case 'LOCKED':
      return 'LOCKED'
    case 'RACING':
      return 'RACING'
    case 'FINISHED':
    case 'SETTLED':
      return 'RESULT'
    default:
      return status ?? '…'
  }
}

export default function App() {
  const g = useBackendGame()
  const trackRef = useRef<HTMLDivElement>(null)
  const [resultDismissed, setResultDismissed] = useState<string | null>(null)

  useEffect(() => {
    if (g.race?.status === 'BETTING_OPEN' || g.race?.status === 'RACING') {
      trackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [g.race?.status])

  const localResult: LocalRaceResult | null = g.visualResult
    ? {
        raceId: g.visualResult.raceId,
        positions: g.visualResult.positions,
        winner: g.visualResult.winner,
        second: g.visualResult.second,
        third: g.visualResult.third,
      }
    : null

  const latestSettled = g.bets.find(
    (b) => b.settlementStatus === 'SETTLED' || b.settlementStatus === 'REFUNDED',
  )
  const showResultModal =
    (g.race?.status === 'SETTLED' || g.race?.status === 'FINISHED') &&
    !g.showFinishMoment &&
    !!latestSettled &&
    latestSettled.raceId === g.race?.id &&
    resultDismissed !== latestSettled.id

  let payout: PayoutBreakdown | null = null
  let place: FinishPlace | null = null
  if (latestSettled && g.race?.result) {
    const p = g.race.result.positions.indexOf(latestSettled.horseId) + 1
    place = (p >= 1 && p <= 6 ? p : 6) as FinishPlace
    const pay = latestSettled.payoutCents / 100
    const stake = latestSettled.stakeCents / 100
    payout = {
      place,
      multiplier: latestSettled.finalDividend,
      betAmount: stake,
      payout: pay,
      profit: Math.round((pay - stake) * 100) / 100,
      isWin: pay > 0 && latestSettled.settlementStatus === 'SETTLED',
    }
  }

  const history = g.bets.slice(0, 8).map((b) => {
    const horse = getHorseById(b.horseId)
    const placeNum = (g.race?.result?.positions.indexOf(b.horseId) ?? -1) + 1
    return {
      id: b.id,
      raceId: b.raceId,
      horseId: b.horseId,
      horseName: horse?.name ?? b.horseId,
      place: (placeNum >= 1 && placeNum <= 6 ? placeNum : 6) as FinishPlace,
      betAmount: b.stakeCents / 100,
      payout: b.payoutCents / 100,
      profit: (b.payoutCents - b.stakeCents) / 100,
      timestamp: new Date(b.createdAt).getTime(),
    }
  })

  const countdown =
    g.race?.status === 'LOCKED'
      ? 'READY'
      : g.race?.status === 'RACING' && Object.values(g.raceProgress).every((p) => p === 0)
        ? 'GO!'
        : null

  const bettingDisabled = !g.bettingOpen

  return (
    <div className="app-shell min-h-dvh text-cream">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col">
        <Header balance={g.balance} />

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 text-[10px] uppercase tracking-[0.16em] text-muted sm:px-6">
          <span>
            {g.backendOk ? (
              <>
                Race #{g.race?.raceNumber ?? '—'} · {statusLabel(g.race?.status)}
                {g.connected ? ' · Live' : ' · Polling'}
              </>
            ) : (
              <span className="text-rose-300">Backend offline — start Go server on :8080</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => void g.resetDemo()}
            className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-cream/80 hover:border-gold/40"
          >
            Reset demo
          </button>
        </div>

        {g.error && (
          <p className="px-4 text-sm text-rose-300 sm:px-6">{g.error}</p>
        )}

        <main className="flex flex-1 flex-col gap-4 pb-8 pt-2 sm:gap-5">
          <div ref={trackRef}>
            <RaceTrack
              progress={g.raceProgress}
              progressRef={g.progressRef}
              selectedHorseId={g.selectedHorseId}
              isRacing={g.isRacing}
              countdownLabel={countdown}
              result={localResult}
              showFinishMoment={g.showFinishMoment}
              confettiActive={g.showFinishMoment && g.race?.status === 'RACING'}
              finishIntensity={g.finishIntensity}
            />
          </div>

          <RaceCountdown label={countdown} />

          <HorseSelector
            selectedHorseId={g.selectedHorseId}
            disabled={bettingDisabled}
            market={g.market}
            dividendFor={g.dividendFor}
            onSelect={g.setSelectedHorseId}
          />

          <BetSelector
            betAmount={g.betAmount}
            customBet={g.customBet}
            market={g.market}
            disabled={bettingDisabled}
            canPlaceBet={g.canPlaceBet}
            onQuickSelect={(n) => {
              g.setBetAmount(n)
              g.setCustomBet('')
            }}
            onCustomChange={g.setCustomBet}
            onMarketChange={g.setMarket}
            onPlaceBet={() => void g.placeBet()}
          />

          <section className="px-4 sm:px-6">
            <h2 className="mb-2 font-display text-lg font-semibold text-cream">Upcoming</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {g.upcoming.map((r) => (
                <div
                  key={r.id}
                  className="min-w-[7rem] rounded-2xl border border-white/8 bg-surface px-3 py-2 text-xs"
                >
                  <p className="font-semibold text-cream">#{r.raceNumber}</p>
                  <p className="text-muted">{r.status}</p>
                </div>
              ))}
              {g.upcoming.length === 0 && (
                <p className="text-sm text-muted">No upcoming races yet.</p>
              )}
            </div>
          </section>

          <RaceHistory history={history} />
        </main>
      </div>

      <RaceResult
        open={Boolean(showResultModal && payout && place && latestSettled)}
        horseId={latestSettled?.horseId ?? null}
        payout={payout}
        place={place}
        onRaceAgain={() => {
          if (latestSettled) setResultDismissed(latestSettled.id)
          void g.refresh()
        }}
      />
    </div>
  )
}
