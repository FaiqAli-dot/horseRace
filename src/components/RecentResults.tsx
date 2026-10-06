import { getHorseById } from '../data/horses'
import type { RaceDTO } from '../services/types'

interface RecentResultsProps {
  races: RaceDTO[]
}

export function RecentResults({ races }: RecentResultsProps) {
  return (
    <section>
      <div className="mb-2 flex items-end justify-between">
        <h2 className="font-display text-lg font-semibold text-cream">Recent Results</h2>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
          Backend board
        </span>
      </div>
      {races.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-muted">
          Results appear after the first settled race.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-1">
          {races.map((r) => {
            const w = r.result ? getHorseById(r.result.winner) : undefined
            const s = r.result ? getHorseById(r.result.second) : undefined
            const t = r.result ? getHorseById(r.result.third) : undefined
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-white/8 bg-surface/80 px-3 py-2.5"
              >
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  Race #{r.raceNumber}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  {[w, s, t].map((h, i) =>
                    h ? (
                      <span
                        key={h.id}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-ink"
                        style={{ backgroundColor: h.color }}
                        title={`${i + 1}. ${h.name}`}
                      >
                        {h.number}
                      </span>
                    ) : null,
                  )}
                  <span className="min-w-0 truncate text-sm font-semibold text-cream">
                    {w?.name ?? '—'}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
