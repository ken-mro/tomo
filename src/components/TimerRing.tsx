import { useTranslation } from 'react-i18next'
import type { Mode } from '../types'
import { formatTime } from '../lib/format'
import { ProgressRing } from './ProgressRing'

interface TimerRingProps {
  mode: Mode
  remainingMs: number
  durationMs: number
  /** Pulse the ring when an interval has ended. */
  alarm?: boolean
}

// The ring's pixel size is owned by CSS (--ring-size) so it can adapt to small
// screens and switch to a compact size in landscape.
export function TimerRing({ mode, remainingMs, durationMs, alarm = false }: TimerRingProps) {
  const { t } = useTranslation()
  const fraction = durationMs > 0 ? remainingMs / durationMs : 0
  const time = formatTime(remainingMs)

  return (
    <div className={`timer-ring${alarm ? ' is-alarm' : ''}`}>
      <ProgressRing fraction={fraction} />
      <div className="timer-ring__label" role="timer" aria-live="off">
        <div className="timer-ring__time">{time}</div>
        <div className="timer-ring__mode">{t(`mode.${mode}`)}</div>
      </div>
    </div>
  )
}
