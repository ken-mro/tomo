import { useTranslation } from 'react-i18next'
import type { Mode } from '../types'

/**
 * Tab order, exported so swipe navigation steps through the same sequence.
 * Readonly so it can't be mutated (which would also reorder the tabs here).
 */
export const MODE_ORDER = ['work', 'short', 'long'] as const satisfies readonly Mode[]

interface ModeTabsProps {
  mode: Mode
  onSelect: (m: Mode) => void
  /** Disable switching (e.g. while the timer is running). */
  disabled?: boolean
}

/** Tabs for switching between Work / Short Break / Long Break. */
export function ModeTabs({ mode, onSelect, disabled = false }: ModeTabsProps) {
  const { t } = useTranslation()
  return (
    <div className="mode-tabs" role="tablist" aria-label={t('mode.group')}>
      {MODE_ORDER.map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={mode === m}
          // The active tab stays enabled; the others are locked while running.
          disabled={disabled && mode !== m}
          className={`mode-tab${mode === m ? ' is-active' : ''}`}
          onClick={() => onSelect(m)}
        >
          {t(`mode.${m}`)}
        </button>
      ))}
    </div>
  )
}
