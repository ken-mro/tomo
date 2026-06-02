import { useTranslation } from 'react-i18next'
import type { Mode } from '../types'
import { formatTime } from '../lib/format'
import { Controls } from './Controls'
import { Mascot } from './Mascot'

interface PipTimerProps {
  mode: Mode
  remainingMs: number
  running: boolean
  started: boolean
  alarm: boolean
  onToggle: () => void
  onSkip: () => void
}

/** The compact timer rendered into the floating PiP window. */
export function PipTimer({ mode, remainingMs, running, started, alarm, onToggle, onSkip }: PipTimerProps) {
  const { t } = useTranslation()
  return (
    <div className={`pip-root mode-${mode}${alarm ? ' is-alarm' : ''}`}>
      <div className="pip-mode">
        <Mascot size={22} decorative />
        <span>{alarm ? t('alarm.heading') : t(`mode.${mode}`)}</span>
      </div>
      <div className="pip-time">{formatTime(remainingMs)}</div>
      <Controls running={running} started={started} onToggle={onToggle} onReset={() => {}} onSkip={onSkip} compact />
    </div>
  )
}
