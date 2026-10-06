import type { RaceDTO } from '../services/types'

interface UpcomingRacesProps {
  current: RaceDTO | null
  upcoming: RaceDTO[]
  selectedId: string | null
  onSelect: (race: RaceDTO) => void
}

function statusTone(status: string) {
  if (status === 'BETTING_OPEN') return 'text-emerald-300 border-emerald-400/35'
  if (status === 'SCHEDULED') return 'text-sky-200 border-sky-400/30'
  if (status === 'LOCKED' || status === 'RACING') return 'text-amber-200 border-amber-400/35'
  return 'text-muted border-white/10'
}

export function UpcomingRaces({
  current,
  upcoming,
  selectedId,
  onSelect,
}: UpcomingRacesProps) {
  const list: RaceDTO[] = []
  if (current) list.push(current)
  for (const r of upcoming) {
    if (!list.some((x) => x.id === r.id)) list.push(r)
  }

  return (
    <section>
      <div className="mb-2 flex items-end justify-between">
        <h2 className="font-display text-lg font-semibold text-cream">Upcoming Races</h2>
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted">
          Bet any open race
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {list.map((r) => {
          const open = r.status === 'BETTING_OPEN' || r.status === 'SCHEDULED'
          const selected = selectedId === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r)}
              className={`flex min-h-12 items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-gold/50 bg-gold/10'
                  : 'border-white/8 bg-surface/80 hover:border-white/20'
              }`}
            >
              <div>
                <p className="font-display text-base font-bold text-cream">#{r.raceNumber}</p>
                <p className="text-[11px] text-muted">{r.id}</p>
              </div>
              <span
                className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusTone(r.status)}`}
              >
                {open ? r.status.replace('_', ' ') : r.status}
              </span>
            </button>
          )
        })}
        {list.length === 0 && (
          <p className="text-sm text-muted">Waiting for race pipeline…</p>
        )}
      </div>
    </section>
  )
}
