import { useTranslation } from 'react-i18next'
import { Mascot } from './Mascot'
import type { ThemeChoice } from '../lib/storage'

interface HeaderProps {
  theme: ThemeChoice
  onToggleTheme: () => void
  pipSupported: boolean
  pipOpen: boolean
  onTogglePip: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  fullscreenSupported: boolean
  onOpenSettings: () => void
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}
function PipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
    </svg>
  )
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15H3.5a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 5 9.4a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 5.6h.09A1.65 1.65 0 0 0 11 4V3.5a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 16 5.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 9v.09A1.65 1.65 0 0 0 21 11h.5a2 2 0 0 1 0 4H21z" />
    </svg>
  )
}

export function Header({
  theme,
  onToggleTheme,
  pipSupported,
  pipOpen,
  onTogglePip,
  isFullscreen,
  onToggleFullscreen,
  fullscreenSupported,
  onOpenSettings,
}: HeaderProps) {
  const { t } = useTranslation()
  return (
    <header className="app-header">
      <div className="brand">
        <Mascot size={40} decorative />
        <div className="brand__text">
          <span className="brand__name">tomo</span>
          <span className="brand__tagline">{t('tagline')}</span>
        </div>
      </div>
      <div className="header-actions">
        <button
          className="btn btn--ghost btn--icon"
          onClick={onTogglePip}
          disabled={!pipSupported}
          aria-pressed={pipOpen}
          aria-label={pipOpen ? t('pip.close') : t('pip.open')}
          title={pipSupported ? (pipOpen ? t('pip.close') : t('pip.open')) : t('pip.unsupported')}
        >
          <PipIcon />
        </button>
        {fullscreenSupported && (
          <button
            className="btn btn--ghost btn--icon"
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
            title={isFullscreen ? t('fullscreen.exit') : t('fullscreen.enter')}
          >
            <FullscreenIcon />
          </button>
        )}
        <button
          className="btn btn--ghost btn--icon"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
          title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
        <button className="btn btn--ghost btn--icon" onClick={onOpenSettings} aria-label={t('settings.open')} title={t('settings.title')}>
          <GearIcon />
        </button>
      </div>
    </header>
  )
}
