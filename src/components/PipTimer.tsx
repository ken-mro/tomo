import { useTranslation } from 'react-i18next'
import type { Mode, PipLayout } from '../types'
import { formatTime } from '../lib/format'
import { Controls } from './Controls'
import { Mascot } from './Mascot'
import { ProgressRing } from './ProgressRing'

interface PipTimerProps {
  mode: Mode
  remainingMs: number
  durationMs: number
  running: boolean
  started: boolean
  alarm: boolean
  layout: PipLayout
  onToggle: () => void
  onSkip: () => void
}

/** The compact timer rendered into the floating PiP window, with a progress ring. */
export function PipTimer({ mode, remainingMs, durationMs, running, started, alarm, layout, onToggle, onSkip }: PipTimerProps) {
  const { t } = useTranslation()
  const fraction = durationMs > 0 ? remainingMs / durationMs : 0
  const label = alarm ? t('alarm.heading') : t(`mode.${mode}`)
  const controls = <Controls running={running} started={started} onToggle={onToggle} onReset={() => {}} onSkip={onSkip} compact />

  // Portrait: one ring wrapping mode + time + controls. Landscape: a compact
  // ring (time only) on the left with the mode label + controls beside it.
  return (
    <div className={`pip-root pip-root--${layout} mode-${mode}${alarm ? ' is-alarm' : ''}`}>
      <div className="pip-ring">
        <ProgressRing fraction={fraction} />
        <div className="pip-ring__label">
          {layout === 'portrait' && (
            <div className="pip-mode">
              <Mascot size={18} decorative />
              <span>{label}</span>
            </div>
          )}
          <div className="pip-time">{formatTime(remainingMs)}</div>
          {layout === 'portrait' && controls}
        </div>
      </div>
      {layout === 'landscape' && (
        <div className="pip-aside">
          <div className="pip-mode">
            <Mascot size={18} decorative />
            <span>{label}</span>
          </div>
          {controls}
        </div>
      )}
    </div>
  )
}
