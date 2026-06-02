import type { Settings, Stats } from '../types'

const SETTINGS_KEY = 'tomo.settings'
const STATS_KEY = 'tomo.stats'
const THEME_KEY = 'tomo.theme'

export const DEFAULT_SETTINGS: Settings = {
  workMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  volume: 0.7,
  tickingEnabled: false,
  sound: 'bell',
}

export function todayISO(): string {
  // Local-date based YYYY-MM-DD so the daily count rolls over at local midnight.
  const d = new Date()
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    // Merge so new fields added across versions get sensible defaults.
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

export function loadStats(): Stats {
  const fresh: Stats = { date: todayISO(), todayCount: 0, cycleCount: 0 }
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return fresh
    const parsed = JSON.parse(raw) as Stats
    // Roll the daily count over if the stored date is no longer today.
    if (parsed.date !== fresh.date) return { ...fresh, cycleCount: parsed.cycleCount ?? 0 }
    return parsed
  } catch {
    return fresh
  }
}

export function saveStats(s: Stats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s))
  } catch {
    /* non-fatal */
  }
}

export type ThemeChoice = 'light' | 'dark'

export function loadTheme(): ThemeChoice | null {
  const t = localStorage.getItem(THEME_KEY)
  return t === 'light' || t === 'dark' ? t : null
}

export function saveTheme(t: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch {
    /* non-fatal */
  }
}
