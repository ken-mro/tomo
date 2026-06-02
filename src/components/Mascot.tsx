interface MascotProps {
  size?: number
  className?: string
  /** Hide from assistive tech when purely decorative. */
  decorative?: boolean
}

/**
 * The tomo mascot: a round tomato with a leaf crown, dot eyes with catchlights,
 * soft cheeks, a friendly smile, and one little arm raised in a wave. Colors
 * come from CSS custom properties so the mascot brightens in dark mode.
 */
export function Mascot({ size = 96, className, decorative = false }: MascotProps) {
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': 'tomo' } as const)
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg" {...a11y}>
      <ellipse cx="60" cy="66" rx="40" ry="37" fill="var(--m-body)" stroke="var(--m-outline)" strokeWidth="2" />
      <path d="M60 31 C48 29 37 24 33 17 C45 17 56 23 60 30 Z" fill="var(--m-leaf)" />
      <path d="M60 31 C72 29 83 24 87 17 C75 17 64 23 60 30 Z" fill="var(--m-leaf)" />
      <path d="M60 30 L60 19" stroke="var(--m-leaf-dark)" strokeWidth="4" strokeLinecap="round" />
      {/* raised waving arm */}
      <path d="M95 64 Q104 56 102 47" className="tomo-arm" stroke="var(--m-outline)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="102" cy="45" r="5" fill="var(--m-body)" stroke="var(--m-outline)" strokeWidth="2" className="tomo-hand" />
      <circle cx="49" cy="63" r="3.2" fill="var(--m-eye)" />
      <circle cx="71" cy="63" r="3.2" fill="var(--m-eye)" />
      <circle cx="50" cy="62" r="1" fill="#fff" />
      <circle cx="72" cy="62" r="1" fill="#fff" />
      <circle cx="43" cy="75" r="5" fill="var(--m-cheek)" opacity="0.6" />
      <circle cx="77" cy="75" r="5" fill="var(--m-cheek)" opacity="0.6" />
      <path d="M48 75 Q60 87 72 75" fill="none" stroke="var(--m-mouth)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
