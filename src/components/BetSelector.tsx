const QUICK_BETS = [0.1, 0.5, 1, 5, 10]

interface BetSelectorProps {
  betAmount: number
  customBet: string
  disabled: boolean
  canPlaceBet: boolean
  onQuickSelect: (amount: number) => void
  onCustomChange: (value: string) => void
  onPlaceBet: () => void
}

function formatQuick(amount: number): string {
  return amount < 1 ? `$${amount.toFixed(2)}` : `$${amount}`
}

export function BetSelector({
  betAmount,
  customBet,
  disabled,
  canPlaceBet,
  onQuickSelect,
  onCustomChange,
  onPlaceBet,
}: BetSelectorProps) {
  const activeQuick =
    customBet.trim() === '' ? betAmount : Number.parseFloat(customBet)

  return (
    <section className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-6">
      <div className="pointer-events-auto mx-auto max-w-5xl rounded-3xl border border-gold/20 bg-surface/95 p-3 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold tracking-wide text-cream sm:text-lg">
            Bet Amount
          </h2>
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-gold">
            Demo Mode · Virtual Balance
          </span>
        </div>

        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
          {QUICK_BETS.map((amount) => {
            const active = customBet.trim() === '' && betAmount === amount
            return (
              <button
                key={amount}
                type="button"
                disabled={disabled}
                onClick={() => onQuickSelect(amount)}
                className={`min-h-10 min-w-[3.75rem] shrink-0 rounded-xl border px-2.5 py-2 text-sm font-semibold tabular-nums transition-colors sm:min-w-[4.5rem] sm:flex-1 ${
                  active
                    ? 'border-gold bg-gold text-ink'
                    : 'border-white/10 bg-surface-2 text-cream hover:border-gold/40'
                } ${disabled ? 'cursor-not-allowed opacity-55' : ''}`}
              >
                {formatQuick(amount)}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <label className="block min-w-0 flex-1">
            <span className="sr-only">Custom amount</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Custom"
                disabled={disabled}
                value={customBet}
                onChange={(e) => onCustomChange(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-white/10 bg-ink/60 py-3 pl-7 pr-3 text-base text-cream outline-none ring-gold/40 placeholder:text-muted/60 focus:border-gold/50 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-55"
              />
            </div>
          </label>

          <button
            type="button"
            disabled={!canPlaceBet}
            onClick={onPlaceBet}
            className="min-h-12 shrink-0 rounded-2xl bg-gradient-to-r from-gold-dim via-gold to-gold-light px-5 py-3 font-display text-base font-bold tracking-[0.08em] text-ink shadow-[0_10px_30px_rgba(212,160,23,0.28)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:min-w-[14rem] sm:text-lg"
          >
            PLACE BET
            {Number.isFinite(activeQuick) && activeQuick > 0
              ? ` · $${activeQuick.toFixed(2)}`
              : ''}
          </button>
        </div>
      </div>
    </section>
  )
}
