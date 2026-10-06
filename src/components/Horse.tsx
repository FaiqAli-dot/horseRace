interface HorseSilhouetteProps {
  color: string
  className?: string
  flipped?: boolean
  /** Lightweight gallop cycle — CSS only, safe for mobile. */
  galloping?: boolean
}

/** Inline SVG silhouette with optional leg/body gallop cycle. */
export function HorseSilhouette({
  color,
  className = '',
  flipped = false,
  galloping = false,
}: HorseSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 120 72"
      className={`${className} ${flipped ? '-scale-x-100' : ''} ${galloping ? 'horse-gallop' : ''}`}
      aria-hidden="true"
    >
      <g className="horse-rig" fill={color}>
        {/* Body */}
        <path
          className="horse-body"
          d="M22 48c2-7 8-12 15-14 3-5 8-9 14-10 4-4 9-6 15-5 3 0 5 2 6 4 3-1 6 0 8 2l7 2c3 1 4 3 3 6h-2c1 2 0 5-2 7l-3 7c-1 2-3 3-5 3h-5c-2 3-5 5-9 5-5 0-8-2-10-6H36c-6 0-11-3-14-9z"
        />
        {/* Neck / head */}
        <path
          className="horse-head"
          d="M70 24c4-6 10-9 16-8 2 3 1 6-1 8-3 1-5 0-7-1-2 2-4 3-7 3v-2z"
          opacity="0.95"
        />
        <circle cx="86" cy="20" r="2" fill="#0a0b0f" opacity="0.55" />

        {/* Legs — pivot via CSS transform-origin in % of viewBox via SVG coords */}
        <g className="leg leg-back-far" stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M40 52v12" />
        </g>
        <g className="leg leg-back-near" stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M48 53v11" />
        </g>
        <g className="leg leg-front-far" stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M66 52v12" />
        </g>
        <g className="leg leg-front-near" stroke={color} strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M74 51v13" />
        </g>

        {/* Tail flick */}
        <path
          className="horse-tail"
          d="M24 40c-4 2-7 6-6 10 2-1 4-2 5-5"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.85"
        />
      </g>
    </svg>
  )
}
