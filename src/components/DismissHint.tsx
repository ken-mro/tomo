import { useTranslation } from 'react-i18next'

/**
 * Shown in the banner while the alarm is flashing, in place of the usual
 * subheading. It tells the user that a click anywhere in the view stops the
 * blinking — which replaces the old explicit "Stop alarm" button (the whole
 * view is the dismiss target now).
 */
export function DismissHint() {
  const { t } = useTranslation()
  return (
    <p className="break-banner__sub alarm-hint">
      <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
        <path d="M5.6 3.2 19 9.1c.74.33.69 1.4-.08 1.65l-5.3 1.72-1.72 5.3c-.25.77-1.32.82-1.65.08L4.4 4.4c-.3-.67.39-1.36 1.2-1.2z" />
      </svg>
      {t('alarm.dismiss')}
    </p>
  )
}
