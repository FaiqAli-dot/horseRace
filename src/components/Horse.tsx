interface HorseSilhouetteProps {
  color: string
  className?: string
  flipped?: boolean
}

/** Lightweight inline SVG — works even if external assets fail. */
export function HorseSilhouette({
  color,
  className = '',
  flipped = false,
}: HorseSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 120 72"
      className={`${className} ${flipped ? '-scale-x-100' : ''}`}
      aria-hidden="true"
      fill={color}
    >
      <path d="M18 52c2-8 8-14 16-16 3-6 8-10 14-11 4-5 10-8 16-7 3 0 5 2 6 4 3-1 7 0 9 3l8 2c3 1 5 4 4 7-1 2-3 3-5 3h-2c1 3 0 6-2 8l-4 8c-1 2-3 3-5 3h-6c-2 4-6 6-10 6-5 0-9-3-11-7H34c-6 0-12-4-16-10z" />
      <path d="M72 22c4-6 10-9 16-8 2 3 1 7-1 9-3 1-6 0-8-2-2 2-4 3-7 3v-2z" opacity="0.9" />
      <path d="M34 56v10M44 57v9M62 56v10M72 55v11" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
      <circle cx="88" cy="20" r="2.2" fill="#0a0b0f" opacity="0.55" />
    </svg>
  )
}
