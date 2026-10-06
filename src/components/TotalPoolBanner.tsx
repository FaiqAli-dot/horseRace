import { motion } from 'framer-motion'
import { centsToDollars, formatMoney } from '../services/money'
import { totalPoolCents } from '../game/poolLabels'
import type { MarketPool } from '../services/types'

interface TotalPoolBannerProps {
  pools: MarketPool[]
  locked: boolean
  takeoutRate?: number
}

export function TotalPoolBanner({ pools, locked, takeoutRate = 0.04 }: TotalPoolBannerProps) {
  const total = totalPoolCents(pools)
  return (
    <div className="mx-4 flex items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-gradient-to-r from-[#1a160c] to-surface px-4 py-3 sm:mx-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/70">
          Total Pool {locked ? '· Frozen' : '· Live'}
        </p>
        <motion.p
          key={total}
          initial={{ y: 6, opacity: 0.6 }}
          animate={{ y: 0, opacity: 1 }}
          className="font-display text-2xl font-bold tabular-nums text-gold-light sm:text-3xl"
        >
          {formatMoney(centsToDollars(total))}
        </motion.p>
      </div>
      <p className="max-w-[9rem] text-right text-[10px] leading-snug text-muted sm:max-w-none sm:text-xs">
        Pari-mutuel · {(takeoutRate * 100).toFixed(0)}% takeout
        <br />
        Dividends from pool ratios
      </p>
    </div>
  )
}
