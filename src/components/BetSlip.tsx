import { AnimatePresence, motion } from 'framer-motion'
import { getHorseById } from '../data/horses'
import { formatDividend, formatMoney } from '../services/money'
import type { Market, PlaceBetResponse, RaceDTO } from '../services/types'

const QUICK = [0.1, 0.5, 1, 5, 10]
const MARKETS: { id: Market; label: string }[] = [
  { id: 'WIN', label: '1st / Win' },
  { id: 'PLACE_2', label: '2nd' },
  { id: 'PLACE_3', label: '3rd' },
]

interface BetSlipProps {
  race: RaceDTO | null
  horseId: string | null
  market: Market
  stake: number
  customBet: string
  dividend: number
  locked: boolean
  canPlaceBet: boolean
  mobileSheet: boolean
  open: boolean
  onClose: () => void
  onMarketChange: (m: Market) => void
  onQuickSelect: (n: number) => void
  onCustomChange: (v: string) => void
  onPlaceBet: () => void
  accepted: PlaceBetResponse | null
  onClearAccepted: () => void
}

function SlipBody(props: BetSlipProps) {
  const horse = props.horseId ? getHorseById(props.horseId) : undefined
  const estPayout = props.dividend > 0 ? props.stake * props.dividend : 0

  if (props.accepted) {
    return (
      <div className="space-y-3">
        <p className="font-display text-lg font-bold text-emerald-300">BET ACCEPTED</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-[10px] uppercase text-muted">Bet ID</dt>
            <dd className="truncate font-mono text-xs text-cream">{props.accepted.betId}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-muted">Status</dt>
            <dd className="font-semibold text-cream">{props.accepted.status}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-muted">Stake</dt>
            <dd className="tabular-nums text-cream">{formatMoney(props.accepted.stake)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-muted">Est. dividend</dt>
            <dd className="tabular-nums text-gold">
              {formatDividend(props.accepted.estimatedDividend)}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={props.onClearAccepted}
          className="min-h-11 w-full rounded-xl border border-white/15 bg-surface-2 font-semibold text-cream"
        >
          Place another
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-cream">Bet Slip</h2>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
            Race #{props.race?.raceNumber ?? '—'}
            {props.locked ? ' · Locked' : ''}
          </p>
        </div>
        {props.mobileSheet && (
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted hover:text-cream"
          >
            Close
          </button>
        )}
      </div>

      <div className="rounded-xl border border-white/8 bg-ink/40 px-3 py-2 text-sm">
        <p className="text-cream">
          <span className="text-muted">Horse · </span>
          {horse ? (
            <span className="font-semibold" style={{ color: horse.accent }}>
              #{horse.number} {horse.name}
            </span>
          ) : (
            <span className="text-rose-300">Select from pool table</span>
          )}
        </p>
        <p className="mt-1 text-cream">
          <span className="text-muted">Market · </span>
          {MARKETS.find((m) => m.id === props.market)?.label}
        </p>
      </div>

      <div className="flex gap-1.5">
        {MARKETS.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={props.locked}
            onClick={() => props.onMarketChange(m.id)}
            className={`min-h-11 flex-1 rounded-xl border text-xs font-semibold sm:text-sm ${
              props.market === m.id
                ? 'border-gold bg-gold text-ink'
                : 'border-white/10 bg-surface-2 text-cream'
            } disabled:opacity-50`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK.map((n) => (
          <button
            key={n}
            type="button"
            disabled={props.locked}
            onClick={() => props.onQuickSelect(n)}
            className={`min-h-11 min-w-[3.5rem] flex-1 rounded-xl border px-2 text-sm font-semibold tabular-nums ${
              props.customBet.trim() === '' && props.stake === n
                ? 'border-gold bg-gold text-ink'
                : 'border-white/10 bg-surface-2 text-cream'
            } disabled:opacity-50`}
          >
            {n < 1 ? `$${n.toFixed(2)}` : `$${n}`}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="sr-only">Custom stake</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            $
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Custom stake"
            disabled={props.locked}
            value={props.customBet}
            onChange={(e) => props.onCustomChange(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-white/10 bg-ink/60 py-3 pl-7 pr-3 text-base text-cream outline-none focus:border-gold/50 disabled:opacity-50"
          />
        </div>
      </label>

      <dl className="grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-surface-2/60 px-3 py-2 text-sm">
        <div>
          <dt className="text-[10px] uppercase text-muted">Current dividend</dt>
          <dd className="font-semibold tabular-nums text-gold">
            {formatDividend(props.dividend)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-muted">Est. payout</dt>
          <dd className="font-semibold tabular-nums text-cream">
            {estPayout > 0 ? formatMoney(estPayout) : '—'}
          </dd>
        </div>
      </dl>

      <p className="text-[11px] leading-snug text-muted">
        Final dividend is determined when betting closes.
      </p>

      <button
        id="place-bet-button"
        type="button"
        disabled={!props.canPlaceBet}
        onClick={props.onPlaceBet}
        className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-gold-dim via-gold to-gold-light px-4 font-display text-base font-bold tracking-[0.08em] text-ink shadow-[0_10px_30px_rgba(212,160,23,0.28)] disabled:cursor-not-allowed disabled:from-zinc-700 disabled:via-zinc-600 disabled:to-zinc-500 disabled:text-zinc-300 disabled:opacity-70 disabled:shadow-none"
      >
        {props.locked ? 'BETTING LOCKED' : `PLACE BET · ${formatMoney(props.stake)}`}
      </button>
    </div>
  )
}

export function BetSlip(props: BetSlipProps) {
  if (!props.mobileSheet) {
    return (
      <section className="rounded-3xl border border-white/8 bg-surface/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <SlipBody {...props} />
      </section>
    )
  }

  return (
    <AnimatePresence>
      {props.open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 sm:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={props.onClose}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label="Bet slip"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
            <SlipBody {...props} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
