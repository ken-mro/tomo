import { useTranslation } from 'react-i18next'
import type { Mode } from '../types'
import { formatTime } from '../lib/format'

interface TimerRingProps {
  mode: Mode
  remainingMs: number
  durationMs: number
  /** Pulse the ring when an interval has ended. */
  alarm?: boolean
}

const R = 46
const CIRC = 2 * Math.PI * R

// The ring's pixel size is owned by CSS (--ring-size) so it can adapt to small
// screens and switch to a compact size in landscape.
export function TimerRing({ mode, remainingMs, durationMs, alarm = false }: TimerRingProps) {
  const { t } = useTranslation()
  const fraction = durationMs > 0 ? Math.max(0, Math.min(1, remainingMs / durationMs)) : 0
  const time = formatTime(remainingMs)

  return (
    <div className={`timer-ring${alarm ? ' is-alarm' : ''}`}>
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
          strokeDashoffset={CIRC * (1 - fraction)}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="timer-ring__label" role="timer" aria-live="off">
        <div className="timer-ring__time">{time}</div>
        <div className="timer-ring__mode">{t(`mode.${mode}`)}</div>
      </div>
    </div>
  )
}
