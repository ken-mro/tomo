import { useTranslation } from 'react-i18next'

interface ProgressDotsProps {
  count: number
  total: number
}

/** Dots that fill in as pomodoros complete, resetting after a long break. */
export function ProgressDots({ count, total }: ProgressDotsProps) {
  const { t } = useTranslation()
  return (
    <div
      className="progress-dots"
      role="img"
      aria-label={t('progress.cycle', { current: Math.min(count + 1, total), total })}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`dot${i < count ? ' is-filled' : ''}`} />
      ))}
    </div>
  )
}
