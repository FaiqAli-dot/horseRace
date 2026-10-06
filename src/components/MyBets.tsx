import { getHorseById } from '../data/horses'
import { formatMoney } from '../services/money'
import type { BetDisplayStatus, BetDTO, RaceResultDTO } from '../services/types'

function displayStatus(b: BetDTO): BetDisplayStatus {
  if (b.settlementStatus === 'REFUNDED' || b.status === 'REFUNDED') return 'REFUNDED'
  if (b.settlementStatus === 'SETTLED' || b.status === 'SETTLED') {
    return b.payoutCents > 0 ? 'WON' : 'LOST'
  }
  if (b.status === 'ACCEPTED' || b.settlementStatus === 'PENDING') return 'PENDING'
  return 'PENDING'
}

const tone: Record<BetDisplayStatus, string> = {
  PENDING: 'border-sky-400/35 bg-sky-950/40 text-sky-200',
  WON: 'border-emerald-400/40 bg-emerald-950/45 text-emerald-300',
  LOST: 'border-rose-400/35 bg-rose-950/40 text-rose-300',
  REFUNDED: 'border-amber-400/35 bg-amber-950/40 text-amber-200',
}

interface MyBetsProps {
  bets: BetDTO[]
  resultsByRaceId: Record<string, RaceResultDTO>
  raceNumbers: Record<string, number>
}

export function MyBets({ bets, resultsByRaceId, raceNumbers }: MyBetsProps) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between">
        <h2 className="font-display text-lg font-semibold text-cream">My Bets</h2>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
          {bets.length} total
        </span>
      </div>
      {bets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-surface/50 px-4 py-6 text-center text-sm text-muted">
          No bets yet — pick a horse and place a pool wager.
        </p>
      ) : (
        <ul className="space-y-2">
          {bets.slice(0, 12).map((b) => {
            const st = displayStatus(b)
            const horse = getHorseById(b.horseId)
            const place =
              (resultsByRaceId[b.raceId]?.positions.indexOf(b.horseId) ?? -1) + 1
            return (
              <li
                key={b.id}
                className="rounded-2xl border border-white/8 bg-surface/85 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-cream">
                      {horse?.name ?? b.horseId}
                      <span className="ml-2 text-xs font-normal text-muted">
                        #{raceNumbers[b.raceId] ?? b.raceId.replace('race-', '')} · {b.market}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted">
                      Stake {formatMoney(b.stakeCents / 100)}
                      {place > 0 ? ` · Finished ${place}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${tone[st]}`}
                  >
                    {st}
                  </span>
                </div>
                {(st === 'WON' || st === 'REFUNDED') && (
                  <p className="mt-1 text-sm font-semibold tabular-nums text-emerald-300">
                    Payout {formatMoney(b.payoutCents / 100)}
                    {b.finalDividend > 0 ? ` · ${b.finalDividend.toFixed(2)}x` : ''}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
