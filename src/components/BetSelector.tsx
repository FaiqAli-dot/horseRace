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
    <section className="px-4 sm:px-6">
      <div className="rounded-3xl border border-white/8 bg-surface/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-wide text-cream">
            Bet Amount
          </h2>
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-gold">
            Demo Mode · Virtual Balance
          </span>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_BETS.map((amount) => {
            const active = customBet.trim() === '' && betAmount === amount
            return (
              <button
                key={amount}
                type="button"
                disabled={disabled}
                onClick={() => onQuickSelect(amount)}
                className={`min-h-11 min-w-[4.5rem] flex-1 rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums transition-colors ${
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

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
            Custom amount
          </span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
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
          className="min-h-13 w-full rounded-2xl bg-gradient-to-r from-gold-dim via-gold to-gold-light px-4 py-3.5 font-display text-lg font-bold tracking-[0.08em] text-ink shadow-[0_10px_30px_rgba(212,160,23,0.28)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          PLACE BET
          {Number.isFinite(activeQuick) && activeQuick > 0
            ? ` · $${activeQuick.toFixed(2)}`
            : ''}
        </button>
      </div>
    </section>
  )
}
