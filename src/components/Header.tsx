import { motion } from 'framer-motion'
import { formatMoney } from '../services/money'

interface HeaderProps {
  balance: number
  onReset?: () => void
}

function AnimatedBalance({ balance }: { balance: number }) {
  return (
    <motion.span
      key={balance}
      initial={{ scale: 1.08, opacity: 0.75 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="inline-block font-semibold tabular-nums text-gold-light"
    >
      {formatMoney(balance)}
    </motion.span>
  )
}

export function Header({ balance, onReset }: HeaderProps) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold/70">
          Demo · Pari-mutuel
        </p>
        <h1 className="font-display text-2xl font-bold tracking-wide text-cream sm:text-3xl">
          HORSE<span className="text-gold"> RACE</span>
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="hidden rounded-xl border border-white/10 px-2.5 py-2 text-[10px] uppercase tracking-[0.12em] text-muted hover:border-gold/40 hover:text-cream sm:block"
          >
            Reset
          </button>
        )}
        <div className="rounded-2xl border border-gold/25 bg-surface/80 px-3 py-2 text-right shadow-[0_0_24px_rgba(212,160,23,0.08)] backdrop-blur-sm sm:px-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Balance
          </p>
          <AnimatedBalance balance={balance} />
        </div>
      </div>
    </header>
  )
}
