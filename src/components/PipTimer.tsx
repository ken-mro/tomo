import { useTranslation } from 'react-i18next'
import type { Mode, PipLayout } from '../types'
import { Controls } from './Controls'
import { DismissHint } from './DismissHint'
import { Mascot } from './Mascot'
import { ProgressDots } from './ProgressDots'
import { TimerRing } from './TimerRing'

interface PipTimerProps {
  mode: Mode
  remainingMs: number
  durationMs: number
  running: boolean
  started: boolean
  alarm: boolean
  layout: PipLayout
  cycleCount: number
  longEvery: number
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
  onStopAlarm: () => void
}

/** Mascot size in the mini window's banner (shared by both layouts). */
const MASCOT_SIZE = 36

/**
 * The mini-window timer. It mirrors the main view — banner, ring, progress dots
 * and controls — just without the mode tabs and the "today" count. Portrait
 * stacks them like the main card; landscape splits them into a ring column and
 * an info column beside it.
 */
export function PipTimer({
  mode,
  remainingMs,
  durationMs,
  running,
  started,
  alarm,
  layout,
  cycleCount,
  longEvery,
  onToggle,
  onReset,
  onSkip,
  onStopAlarm,
}: PipTimerProps) {
  const { t } = useTranslation()
  const isBreak = mode !== 'work'
  const heading = alarm ? t('alarm.heading') : isBreak ? t('break.heading') : t('focus.heading')

  // The same building blocks as the main card, reusing its classes so they look
  // identical — only the arrangement differs between the two PiP layouts.
  const banner = (
    <div className="break-banner pip-banner">
      <Mascot size={MASCOT_SIZE} className="break-banner__mascot" decorative />
      <div>
        <p className="break-banner__heading">{heading}</p>
        {alarm ? (
          <DismissHint />
        ) : (
          <p className="break-banner__sub">{isBreak ? t('break.subheading') : t('focus.subheading')}</p>
        )}
      </div>
    </div>
  )
  const ring = (
    <div className="pip-stage">
      <TimerRing mode={mode} remainingMs={remainingMs} durationMs={durationMs} alarm={alarm} />
    </div>
  )
  const dots = <ProgressDots count={cycleCount} total={longEvery} />
  const controls = <Controls running={running} started={started} onToggle={onToggle} onReset={onReset} onSkip={onSkip} />

  return (
    <div
      className={`pip-root pip-root--${layout} mode-${mode}${alarm ? ' is-alarm' : ''}`}
      // While the window is flashing an alarm, a click anywhere in it stops the
      // blinking (the banner shows a hint saying so). The control buttons already
      // clear the alarm themselves, so the bubbled handler is harmless.
      onClick={alarm ? onStopAlarm : undefined}
    >
      {layout === 'portrait' ? (
        <>
          {banner}
          {ring}
          {dots}
          {controls}
        </>
      ) : (
        <>
          {ring}
          <div className="pip-info">
            {banner}
            {dots}
            {controls}
          </div>
        </>
      )}
    </div>
  )
}
