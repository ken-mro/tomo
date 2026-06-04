import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Settings } from '../types'
import { CUSTOM_SOUND_ID } from '../types'
import { BUILT_IN_SOUNDS, playAlarm } from '../lib/sounds'
import { SUPPORTED_LANGUAGES } from '../i18n'
import type { ThemeChoice } from '../lib/storage'

interface SettingsPanelProps {
  open: boolean
  onClose: () => void
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  /** Whether Document Picture-in-Picture is available (hides the PiP layout option if not). */
  pipSupported: boolean
  theme: ThemeChoice
  onSetTheme: (t: ThemeChoice) => void
  customSoundName: string | null
  onUploadSound: (file: File) => void
  onDeleteSound: () => void
}

function NumberField({
  label,
  unit,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}) {
  // Keep a local text value so the field can be emptied and freely edited
  // (e.g. replacing a single digit) instead of being clamped on every keystroke.
  // The clamped numeric value is committed on blur / Enter.
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])

  const commit = () => {
    const n = Math.round(Number(text))
    if (text.trim() === '' || Number.isNaN(n)) {
      setText(String(value)) // revert empty / invalid input
      return
    }
    const clamped = Math.max(min, Math.min(max, n))
    setText(String(clamped))
    onChange(clamped)
  }

  return (
    <label className="field field--number">
      <span className="field__label">{label}</span>
      <span className="field__control">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
        />
        <span className="field__unit">{unit}</span>
      </span>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  // The whole row is the switch, so clicking the label text toggles it too and
  // it's fully keyboard-operable.
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="field field--toggle toggle-row"
      onClick={() => onChange(!checked)}
    >
      <span className="field__label">{label}</span>
      <span className={`switch${checked ? ' is-on' : ''}`} aria-hidden="true">
        <span className="switch__thumb" />
      </span>
    </button>
  )
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  onChange,
  pipSupported,
  theme,
  onSetTheme,
  customSoundName,
  onUploadSound,
  onDeleteSound,
}: SettingsPanelProps) {
  const { t, i18n } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)

  const soundOptions = [
    ...BUILT_IN_SOUNDS.map((s) => ({ id: s.id, name: t(`sounds.${s.id}`) })),
    ...(customSoundName ? [{ id: CUSTOM_SOUND_ID, name: customSoundName }] : []),
  ]

  return (
    <>
      <div className={`scrim${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`settings${open ? ' is-open' : ''}`} role="dialog" aria-modal="true" aria-label={t('settings.title')} hidden={!open}>
        <header className="settings__header">
          <h2>{t('settings.title')}</h2>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label={t('settings.close')}>
            <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="settings__body">
          <section>
            <h3>{t('settings.timers')}</h3>
            <NumberField label={t('settings.workDuration')} unit={t('settings.minutes')} value={settings.workMin} min={1} max={180} onChange={(workMin) => onChange({ workMin })} />
            <NumberField label={t('settings.shortDuration')} unit={t('settings.minutes')} value={settings.shortMin} min={1} max={60} onChange={(shortMin) => onChange({ shortMin })} />
            <NumberField label={t('settings.longDuration')} unit={t('settings.minutes')} value={settings.longMin} min={1} max={60} onChange={(longMin) => onChange({ longMin })} />
            <NumberField label={t('settings.longEvery')} unit={t('settings.sessions')} value={settings.longEvery} min={1} max={12} onChange={(longEvery) => onChange({ longEvery })} />
          </section>

          <section>
            <h3>{t('settings.behavior')}</h3>
            <Toggle label={t('settings.autoStartBreaks')} checked={settings.autoStartBreaks} onChange={(autoStartBreaks) => onChange({ autoStartBreaks })} />
            <Toggle label={t('settings.autoStartPomodoros')} checked={settings.autoStartPomodoros} onChange={(autoStartPomodoros) => onChange({ autoStartPomodoros })} />
            <Toggle label={t('settings.ticking')} checked={settings.tickingEnabled} onChange={(tickingEnabled) => onChange({ tickingEnabled })} />
            <Toggle label={t('settings.backgroundAlarm')} checked={settings.backgroundAlarm} onChange={(backgroundAlarm) => onChange({ backgroundAlarm })} />
          </section>

          <section>
            <h3>{t('settings.sound')}</h3>
            <label className="field field--range">
              <span className="field__label">
                {t('settings.volume')} <span className="field__value">{Math.round(settings.volume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                onChange={(e) => onChange({ volume: Number(e.target.value) })}
              />
            </label>

            <span className="field__label field__label--block">{t('settings.alarmSound')}</span>
            <div className="sound-list">
              {soundOptions.map((s) => (
                <div key={s.id} className={`sound-row${settings.sound === s.id ? ' is-active' : ''}`}>
                  <label className="sound-row__pick">
                    <input
                      type="radio"
                      name="alarm-sound"
                      checked={settings.sound === s.id}
                      onChange={() => onChange({ sound: s.id })}
                    />
                    <span>{s.name}</span>
                  </label>
                  <div className="sound-row__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--icon btn--sm"
                      aria-label={t('settings.preview', { name: s.name })}
                      onClick={() => void playAlarm(s.id, settings.volume)}
                    >
                      <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    {s.id === CUSTOM_SOUND_ID && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        aria-label={t('settings.deleteSound')}
                        title={t('settings.deleteSound')}
                        onClick={onDeleteSound}
                      >
                        <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onUploadSound(file)
                e.target.value = ''
              }}
            />
            <button type="button" className="btn btn--soft btn--block" onClick={() => fileRef.current?.click()}>
              {t('settings.uploadSound')}
            </button>
          </section>

          <section>
            <h3>{t('settings.appearance')}</h3>
            <label className="field">
              <span className="field__label">{t('settings.language')}</span>
              <select className="select" value={i18n.resolvedLanguage} onChange={(e) => void i18n.changeLanguage(e.target.value)}>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field">
              <span className="field__label">{t('settings.theme')}</span>
              <div className="segmented">
                <button className={`segmented__btn${theme === 'light' ? ' is-active' : ''}`} onClick={() => onSetTheme('light')}>
                  {t('settings.themeLight')}
                </button>
                <button className={`segmented__btn${theme === 'dark' ? ' is-active' : ''}`} onClick={() => onSetTheme('dark')}>
                  {t('settings.themeDark')}
                </button>
              </div>
            </div>
            {pipSupported && (
              <div className="field">
                <span className="field__label">{t('settings.pipLayout')}</span>
                <div className="segmented">
                  <button
                    className={`segmented__btn${settings.pipLayout === 'portrait' ? ' is-active' : ''}`}
                    onClick={() => onChange({ pipLayout: 'portrait' })}
                  >
                    {t('settings.pipPortrait')}
                  </button>
                  <button
                    className={`segmented__btn${settings.pipLayout === 'landscape' ? ' is-active' : ''}`}
                    onClick={() => onChange({ pipLayout: 'landscape' })}
                  >
                    {t('settings.pipLandscape')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <footer className="settings__footer">
          <button className="btn btn--primary btn--block" onClick={onClose}>
            {t('settings.done')}
          </button>
        </footer>
      </aside>
    </>
  )
}
