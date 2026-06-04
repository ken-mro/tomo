export type Mode = 'work' | 'short' | 'long'

/** Orientation of the Picture-in-Picture mini window. */
export type PipLayout = 'portrait' | 'landscape'

export interface Settings {
  /** Durations in minutes. */
  workMin: number
  shortMin: number
  longMin: number
  /** Completed work sessions before a long break. */
  longEvery: number
  autoStartBreaks: boolean
  autoStartPomodoros: boolean
  /** 0..1 */
  volume: number
  tickingEnabled: boolean
  /** Built-in sound id, or the sentinel for the user's uploaded sound. */
  sound: string
  /** Keep the alarm audible with the screen off (background audio + wake lock). */
  backgroundAlarm: boolean
  /** Orientation of the Picture-in-Picture window. */
  pipLayout: PipLayout
}

export interface Stats {
  /** ISO date (YYYY-MM-DD) the daily count belongs to. */
  date: string
  /** Pomodoros completed today. */
  todayCount: number
  /** Pomodoros completed in the current long-break cycle (0..longEvery). */
  cycleCount: number
}

export interface BuiltInSound {
  id: string
  /** Path relative to the app base, e.g. "./sounds/bell.wav". */
  src: string
}

export const CUSTOM_SOUND_ID = 'custom'
