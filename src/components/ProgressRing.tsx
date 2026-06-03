const R = 46
const CIRC = 2 * Math.PI * R

interface ProgressRingProps {
  /** Remaining fraction, 0..1 — drawn as the filled arc. */
  fraction: number
}

/**
 * The circular progress indicator (track + remaining arc) on a 100×100 viewBox.
 * Sizing is owned by the parent (the SVG fills 100% of its container), so the
 * same ring works for the main timer and the compact PiP window.
 */
export function ProgressRing({ fraction }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, fraction))
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <circle className="ring-track" cx="50" cy="50" r={R} fill="none" strokeWidth="5" />
      <circle
        className="ring-progress"
        cx="50"
        cy="50"
        r={R}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        strokeDashoffset={CIRC * (1 - clamped)}
        transform="rotate(-90 50 50)"
      />
    </svg>
  )
}
