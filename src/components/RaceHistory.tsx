import { MOCK_LAST_RESULTS } from '../data/mockHistory'
import { formatMoney, getPlaceLabel } from '../game/payout'
import type { HistoryEntry } from '../game/raceTypes'

interface RaceHistoryProps {
  history: HistoryEntry[]
}

export function RaceHistory({ history }: RaceHistoryProps) {
  return (
    <section className="space-y-5 px-4 pb-10 sm:px-6">
      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-lg font-semibold tracking-wide text-cream">
            Your Recent Races
          </h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
            Local session
          </span>
        </div>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-surface/50 px-4 py-6 text-center text-sm text-muted">
            Place a bet to start your session history.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 8).map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-surface/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-cream">
                    {entry.horseName}
                    <span className="ml-2 text-xs text-muted">
                      {getPlaceLabel(entry.place)}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted">
                    Bet {formatMoney(entry.betAmount)}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    entry.profit > 0
                      ? 'text-emerald-400'
                      : entry.profit < 0
                        ? 'text-rose-400'
                        : 'text-muted'
                  }`}
                >
                  {entry.profit > 0 ? '+' : ''}
                  {formatMoney(entry.profit)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-lg font-semibold tracking-wide text-cream">
            Last 10 Results
          </h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
            Demo board
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MOCK_LAST_RESULTS.map((r) => (
            <div
              key={r.raceId}
              className="flex min-w-[4.25rem] flex-col items-center rounded-2xl border border-white/8 bg-surface px-2 py-2"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-ink"
                style={{ backgroundColor: r.winnerColor }}
              >
                {r.winnerNumber}
              </span>
              <span className="mt-1 text-[10px] font-medium text-cream/80">
                {r.winnerName}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted">
          Illustrative winners only — not real gambling history.
        </p>
      </div>
    </section>
  )
}
