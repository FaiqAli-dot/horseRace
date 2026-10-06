/** Optional countdown banner — primary countdown lives on the track overlay. */
interface RaceCountdownProps {
  label: string | null
}

export function RaceCountdown({ label }: RaceCountdownProps) {
  if (!label) return null
  return (
    <div className="px-4 sm:px-6">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-gold">
        {label === 'GO!' ? "They're off!" : 'Gates ready'}
      </p>
    </div>
  )
}
