import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { Header } from './components/Header'
import { ModeTabs } from './components/ModeTabs'
import { TimerRing } from './components/TimerRing'
import { ProgressDots } from './components/ProgressDots'
import { Controls } from './components/Controls'
import { Mascot } from './components/Mascot'
import { SettingsPanel } from './components/Settings'
import { PipTimer } from './components/PipTimer'

import { useTimer, type IntervalEnd } from './hooks/useTimer'
import { useTheme } from './hooks/useTheme'
import { usePip } from './hooks/usePip'

import type { Settings } from './types'
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './lib/storage'
import { formatTime } from './lib/format'
import { playAlarm, startTicking, stopTicking } from './lib/sounds'
import { ensureNotificationPermission, showTimesUpNotification } from './lib/notifications'
import { saveCustomSound, loadCustomSound, clearCustomSound } from './lib/idb'
import { CUSTOM_SOUND_ID } from './types'

const ICON_URL = new URL('tomo.svg', document.baseURI).href
// The Fullscreen API is unavailable on some mobile browsers (notably iOS Safari).
const FULLSCREEN_SUPPORTED = typeof document !== 'undefined' && !!document.fullscreenEnabled

export default function App() {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [customSoundName, setCustomSoundName] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [titleFlash, setTitleFlash] = useState(false)
  const [flashOn, setFlashOn] = useState(false)

  const { theme, toggle: toggleTheme, set: setTheme } = useTheme()
  const pip = usePip()
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null)
  // Monotonic token so a slow playAlarm promise can't clobber a newer alarm.
  const alarmSeq = useRef(0)

  // Persist settings.
  useEffect(() => saveSettings(settings), [settings])

  // Load the name of any previously uploaded custom sound.
  useEffect(() => {
    void loadCustomSound().then((c) => c && setCustomSoundName(c.name))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  // Fired exactly once when any interval ends — the single "time's up" event.
  const handleIntervalEnd = useCallback(
    ({ to }: IntervalEnd) => {
      // 1. Alarm sound. Stop any still-playing alarm first, and guard against a
      // stale promise (from a previous interval) overwriting a newer one.
      const seq = ++alarmSeq.current
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause()
        alarmAudioRef.current = null
      }
      void playAlarm(settings.sound, settings.volume).then((a) => {
        if (seq !== alarmSeq.current) {
          a?.pause()
          return
        }
        alarmAudioRef.current = a
      })
      // 2. System notification (clicking it focuses the window).
      const isWork = to === 'work'
      showTimesUpNotification(
        t(isWork ? 'notify.workTitle' : 'notify.breakTitle'),
        t(isWork ? 'notify.workBody' : 'notify.breakBody'),
        ICON_URL,
      )
      // 3. Best-effort focus (ignored when the tab is backgrounded).
      window.focus()
      // 4. Flash the tab title until the user returns to the tab.
      setTitleFlash(true)
    },
    [settings.sound, settings.volume, t],
  )

  const timer = useTimer(settings, handleIntervalEnd)
  const started = timer.remainingMs < timer.durationMs

  // Ask for notification permission on the first Start (a real user gesture).
  const askedPermission = useRef(false)
  const handleToggle = useCallback(() => {
    if (!timer.running && !askedPermission.current) {
      askedPermission.current = true
      void ensureNotificationPermission()
    }
    timer.toggle()
  }, [timer])

  // Stop the alarm audio whenever the alarm state clears (user acted), and
  // invalidate any in-flight playAlarm promise so it can't resume playback.
  useEffect(() => {
    if (!timer.alarmRinging) {
      alarmSeq.current++
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause()
        alarmAudioRef.current = null
      }
    }
  }, [timer.alarmRinging])

  // Optional ticking sound while working.
  useEffect(() => {
    if (settings.tickingEnabled && timer.running && timer.mode === 'work') {
      startTicking(settings.volume)
      return () => stopTicking()
    }
    stopTicking()
  }, [settings.tickingEnabled, settings.volume, timer.running, timer.mode])

  // Keep the browser tab title in sync (and flash it when time's up).
  useEffect(() => {
    const base = `${formatTime(timer.remainingMs)} — ${t(`mode.${timer.mode}`)}`
    document.title = titleFlash && flashOn ? `⏰ ${t('alarm.heading')}` : `${base} · tomo`
  }, [timer.remainingMs, timer.mode, titleFlash, flashOn, t])

  // Drive the title flash, and stop it once the tab is visible again.
  useEffect(() => {
    if (!titleFlash) return
    const id = setInterval(() => setFlashOn((f) => !f), 800)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTitleFlash(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      setFlashOn(false)
    }
  }, [titleFlash])

  // Track fullscreen state.
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    // NOTE: the Fullscreen API requires a recent user gesture (transient
    // activation), so this cannot be auto-triggered by the timer callback —
    // it's wired to a manual button and the notification click only.
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen().catch(() => {})
  }, [])

  // Keyboard: Space toggles start/pause (unless typing in a form control).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return
      if (e.code === 'Space') {
        e.preventDefault()
        handleToggle()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleToggle])

  // Reflect the active language on <html lang> (i18next doesn't do this itself),
  // which also helps screen readers and hyphenation.
  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? 'en'
  }, [i18n.resolvedLanguage])

  // Keep the PiP document's theme / language attributes in sync.
  useEffect(() => {
    const doc = pip.pipWindow?.document
    if (!doc) return
    doc.documentElement.dataset.theme = theme
    doc.documentElement.lang = i18n.resolvedLanguage ?? 'en'
  }, [pip.pipWindow, theme, i18n.resolvedLanguage])

  const handleUploadSound = useCallback(
    (file: File) => {
      void saveCustomSound(file, file.name).then(() => {
        setCustomSoundName(file.name)
        updateSettings({ sound: CUSTOM_SOUND_ID })
      })
    },
    [updateSettings],
  )

  const handleDeleteSound = useCallback(() => {
    clearCustomSound()
      .then(() => {
        setCustomSoundName(null)
        // If the (now removed) custom sound was selected, fall back to a built-in.
        setSettings((s) => (s.sound === CUSTOM_SOUND_ID ? { ...s, sound: DEFAULT_SETTINGS.sound } : s))
      })
      .catch((err) => {
        // Deletion failed (e.g. IndexedDB unavailable) — keep the existing UI
        // state rather than claiming the sound was removed.
        console.error('Failed to delete custom sound', err)
      })
  }, [])

  const isBreak = timer.mode !== 'work'
  const appClass = useMemo(
    () => `app mode-${timer.mode}${timer.alarmRinging ? ' is-alarm' : ''}`,
    [timer.mode, timer.alarmRinging],
  )

  return (
    <div className={appClass}>
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        pipSupported={pip.supported}
        pipOpen={pip.isOpen}
        onTogglePip={pip.toggle}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        fullscreenSupported={FULLSCREEN_SUPPORTED}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="timer-card">
        <ModeTabs mode={timer.mode} onSelect={timer.selectMode} />

        {(isBreak || timer.alarmRinging) && (
          <div className="break-banner">
            <Mascot size={56} className="break-banner__mascot" decorative />
            <div>
              <p className="break-banner__heading">{timer.alarmRinging ? t('alarm.heading') : t('break.heading')}</p>
              {!timer.alarmRinging && <p className="break-banner__sub">{t('break.subheading')}</p>}
            </div>
          </div>
        )}

        <div className="timer-stage">
          <TimerRing
            mode={timer.mode}
            remainingMs={timer.remainingMs}
            durationMs={timer.durationMs}
            alarm={timer.alarmRinging}
          />
        </div>

        <div className="timer-side">
          <ProgressDots count={timer.cycleCount} total={timer.longEvery} />
          <div className="today-count">
            <span>{t('progress.today')} · {t('progress.pomodoros', { count: timer.todayCount })}</span>
            {timer.todayCount > 0 && (
              <button
                type="button"
                className="today-count__clear"
                onClick={timer.clearToday}
                aria-label={t('progress.clearToday')}
                title={t('progress.clearToday')}
              >
                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            )}
          </div>

          <Controls running={timer.running} started={started} onToggle={handleToggle} onReset={timer.reset} onSkip={timer.skip} />

          {timer.alarmRinging && (
            <button className="btn btn--soft stop-alarm" onClick={timer.stopAlarm}>
              {t('alarm.stop')}
            </button>
          )}
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
        theme={theme}
        onSetTheme={setTheme}
        customSoundName={customSoundName}
        onUploadSound={handleUploadSound}
        onDeleteSound={handleDeleteSound}
      />

      {/* The PiP window shares this React tree, so its state stays in sync both
          ways automatically — controls in either window drive the same timer. */}
      {pip.pipWindow &&
        createPortal(
          <PipTimer
            mode={timer.mode}
            remainingMs={timer.remainingMs}
            running={timer.running}
            started={started}
            alarm={timer.alarmRinging}
            onToggle={handleToggle}
            onSkip={timer.skip}
          />,
          pip.pipWindow.document.body,
        )}
    </div>
  )
}
