import { useTranslation } from 'react-i18next'

interface ControlsProps {
  running: boolean
  /** When paused mid-interval, the primary button says "Resume" rather than "Start". */
  started: boolean
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}
function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" fill="currentColor">
      <path d="M6 5v14l9-7zM16 5h3v14h-3z" />
    </svg>
  )
}

export function Controls({ running, started, onToggle, onReset, onSkip }: ControlsProps) {
  const { t } = useTranslation()
  const primaryLabel = running ? t('controls.pause') : started ? t('controls.resume') : t('controls.start')
  const primaryAria = running ? t('controls.pauseAria') : started ? t('controls.resumeAria') : t('controls.startAria')

  return (
    <div className="controls">
      <button className="btn btn--ghost btn--icon" onClick={onReset} aria-label={t('controls.resetAria')} title={t('controls.reset')}>
        <ResetIcon />
      </button>
      <button className="btn btn--primary" onClick={onToggle} aria-label={primaryAria}>
        {running ? <PauseIcon /> : <PlayIcon />}
        <span>{primaryLabel}</span>
      </button>
      <button className="btn btn--ghost btn--icon" onClick={onSkip} aria-label={t('controls.skipAria')} title={t('controls.skip')}>
        <SkipIcon />
      </button>
    </div>
  )
}
