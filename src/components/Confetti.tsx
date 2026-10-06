import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, type CSSProperties } from 'react'

interface ConfettiProps {
  active: boolean
  /** Wins get denser gold-forward bursts; losses stay subtle. */
  intensity?: 'win' | 'podium' | 'loss'
}

const WIN_COLORS = ['#f0c14b', '#d4a017', '#f5f2eb', '#e8c96a', '#c9a227', '#ffffff']
const LOSS_COLORS = ['#9a958a', '#64748b', '#d4a017', '#cbd5e1']

function pieceStyle(i: number, intensity: 'win' | 'podium' | 'loss') {
  const colors = intensity === 'loss' ? LOSS_COLORS : WIN_COLORS
  const left = ((i * 37) % 100) + (i % 7) - 3
  const delay = (i % 12) * 0.05
  const duration = 1.4 + (i % 5) * 0.18
  const size = 4 + (i % 4)
  const rot = (i * 47) % 360
  return {
    left: `${left}%`,
    width: size,
    height: size * (i % 2 === 0 ? 1.6 : 1),
    backgroundColor: colors[i % colors.length],
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    ['--spin' as string]: `${rot}deg`,
  } as CSSProperties
}

export function Confetti({ active, intensity = 'win' }: ConfettiProps) {
  const count = intensity === 'loss' ? 18 : intensity === 'podium' ? 28 : 40
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => i), [count])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden
        >
          {pieces.map((i) => (
            <span
              key={i}
              className="confetti-piece absolute top-0 rounded-[1px]"
              style={pieceStyle(i, intensity)}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
