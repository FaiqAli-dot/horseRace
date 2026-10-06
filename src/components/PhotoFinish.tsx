import { AnimatePresence, motion } from 'framer-motion'
import { getHorseById } from '../data/horses'
import { HorseSilhouette } from './Horse'

interface PhotoFinishProps {
  open: boolean
  horseId: string | null
}

export function PhotoFinish({ open, horseId }: PhotoFinishProps) {
  const horse = horseId ? getHorseById(horseId) : undefined

  return (
    <AnimatePresence>
      {open && horse && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scaleX: 0.2, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="relative w-[min(92vw,420px)] overflow-hidden rounded-sm border-4 border-cream/90 bg-[#111] shadow-[0_0_60px_rgba(212,160,23,0.25)]"
          >
            <div className="flex items-center justify-between bg-cream px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
              <span>Photo Finish</span>
              <span>Camera 3 · Strip</span>
            </div>
            <div className="relative h-40 overflow-hidden bg-gradient-to-r from-[#2a2218] via-[#3a2e20] to-[#2a2218]">
              <motion.div
                className="absolute inset-y-0 left-0 w-1 bg-cream/90"
                initial={{ x: '10%' }}
                animate={{ x: '88%' }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
              />
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent 0 8px, rgba(0,0,0,0.25) 8px 9px)',
                }}
              />
              <motion.div
                className="absolute bottom-6"
                initial={{ left: '15%' }}
                animate={{ left: '70%' }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
              >
                <HorseSilhouette color={horse.color} className="h-14 w-24" />
              </motion.div>
              <div className="absolute bottom-2 left-3 text-[10px] font-semibold uppercase tracking-wider text-cream/70">
                #{horse.number} {horse.name}
              </div>
            </div>
            <p className="bg-ink px-3 py-2 text-center text-[10px] uppercase tracking-[0.18em] text-gold">
              Reviewing nose · Demo strip
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
