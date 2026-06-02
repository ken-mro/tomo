import { useCallback, useEffect, useRef, useState } from 'react'
import type { Mode, Settings, Stats } from '../types'
import { loadStats, saveStats, todayISO } from '../lib/storage'

export interface IntervalEnd {
  from: Mode
  to: Mode
  autoStarted: boolean
}

export interface TimerApi {
  mode: Mode
  running: boolean
  /** Milliseconds left in the current interval. */
  remainingMs: number
  /** Full length of the current interval, in ms. */
  durationMs: number
  /** Completed work sessions in the current long-break cycle (0..longEvery). */
  cycleCount: number
  /** Work sessions completed today. */
  todayCount: number
  longEvery: number
  /** True while an interval has just ended and is waiting for the user. */
  alarmRinging: boolean
  toggle: () => void
  reset: () => void
  skip: () => void
  selectMode: (m: Mode) => void
  stopAlarm: () => void
  /** Reset today's completed-pomodoro count to zero. */
  clearToday: () => void
  /** While paused/stopped, set the current interval's remaining time (ms). */
  adjustRemaining: (ms: number) => void
}

const minToMs = (min: number) => Math.max(1, Math.round(min)) * 60_000
// Bounds for manual time adjustment (drag on the ring while paused).
const MIN_REMAINING_MS = 60_000
const MAX_REMAINING_MS = 180 * 60_000

export function useTimer(settings: Settings, onIntervalEnd: (e: IntervalEnd) => void): TimerApi {
  const durationFor = useCallback(
    (m: Mode): number =>
      m === 'work' ? minToMs(settings.workMin) : m === 'short' ? minToMs(settings.shortMin) : minToMs(settings.longMin),
    [settings.workMin, settings.shortMin, settings.longMin],
  )

  const [mode, setMode] = useState<Mode>('work')
  const [running, setRunning] = useState(false)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number>(() => durationFor('work'))
  const [alarmRinging, setAlarmRinging] = useState(false)
  const [, forceTick] = useState(0)

  const initialStats = useRef<Stats>(loadStats())
  const [cycleCount, setCycleCount] = useState(initialStats.current.cycleCount)
  const [todayCount, setTodayCount] = useState(initialStats.current.todayCount)

  // Persist counters whenever they change.
  useEffect(() => {
    saveStats({ date: todayISO(), todayCount, cycleCount })
  }, [todayCount, cycleCount])

  // Keep the latest values available to the interval callback without
  // re-subscribing the interval on every render.
  const ref = useRef({ mode, cycleCount, settings, durationFor, onIntervalEnd })
  ref.current = { mode, cycleCount, settings, durationFor, onIntervalEnd }

  // Latest running flag for effects/callbacks that must not re-run when it flips.
  const runningRef = useRef(running)
  runningRef.current = running

  const handleComplete = useCallback(() => {
    const { mode: from, cycleCount: cycle, settings: s, durationFor: dur, onIntervalEnd: notify } = ref.current
    let to: Mode
    if (from === 'work') {
      const nextCycle = cycle + 1
      to = nextCycle % s.longEvery === 0 ? 'long' : 'short'
      setCycleCount(nextCycle)
      setTodayCount((n) => n + 1)
    } else {
      to = 'work'
      if (from === 'long') setCycleCount(0)
    }

    const autoStarted = to === 'work' ? s.autoStartPomodoros : s.autoStartBreaks
    const nextDur = dur(to)
    setMode(to)
    setRemaining(nextDur)
    if (autoStarted) {
      setEndTime(Date.now() + nextDur)
      setRunning(true)
      setAlarmRinging(false)
    } else {
      setEndTime(null)
      setRunning(false)
      setAlarmRinging(true)
    }
    notify({ from, to, autoStarted })
  }, [])

  // Drive the countdown and detect completion. Re-subscribes only when the
  // run state or target end time changes — the 200ms tick itself does not.
  useEffect(() => {
    if (!running || endTime == null) return
    const id = setInterval(() => {
      if (Date.now() >= endTime) {
        // Stop this interval immediately so completion can only fire once, even
        // under heavy main-thread load (don't rely on the re-render to clear it).
        clearInterval(id)
        handleComplete()
      } else {
        forceTick((n) => n + 1)
      }
    }, 200)
    return () => clearInterval(id)
  }, [running, endTime, handleComplete])

  // The displayed remaining time is derived from timestamps so it never drifts.
  const remainingMs = running && endTime != null ? Math.max(0, endTime - Date.now()) : remaining

  const clearAlarm = () => setAlarmRinging(false)

  // Clear today's progress: both the daily count and the long-break cycle dots.
  // The persistence effect saves them under today's date.
  const clearToday = useCallback(() => {
    setTodayCount(0)
    setCycleCount(0)
  }, [])

  // Manually set the remaining time (used by drag-to-adjust). Ignored while
  // running so a live countdown can't be edited out from under itself.
  const adjustRemaining = useCallback((ms: number) => {
    if (runningRef.current) return
    setRemaining(Math.max(MIN_REMAINING_MS, Math.min(MAX_REMAINING_MS, ms)))
  }, [])

  const toggle = useCallback(() => {
    setAlarmRinging(false)
    if (running) {
      // Pause: snapshot the remaining time and stop.
      setRemaining(endTime != null ? Math.max(0, endTime - Date.now()) : remaining)
      setEndTime(null)
      setRunning(false)
    } else {
      // Start / resume. If the interval already elapsed, refill it first.
      const left = remaining > 0 ? remaining : durationFor(mode)
      setRemaining(left)
      setEndTime(Date.now() + left)
      setRunning(true)
    }
  }, [running, endTime, remaining, mode, durationFor])

  const reset = useCallback(() => {
    clearAlarm()
    setRunning(false)
    setEndTime(null)
    setRemaining(durationFor(mode))
  }, [mode, durationFor])

  const skip = useCallback(() => {
    // Jump to the next interval without counting the current one.
    clearAlarm()
    const to: Mode = mode === 'work' ? 'short' : 'work'
    setMode(to)
    setRunning(false)
    setEndTime(null)
    setRemaining(durationFor(to))
  }, [mode, durationFor])

  const selectMode = useCallback(
    (m: Mode) => {
      clearAlarm()
      setMode(m)
      setRunning(false)
      setEndTime(null)
      setRemaining(durationFor(m))
    },
    [durationFor],
  )

  // If durations change in settings (or the mode changes) while not running,
  // reflect the new length. `running` is read via a ref and kept out of the
  // deps so that *pausing* (running → false) doesn't reset the snapshot time.
  useEffect(() => {
    if (!runningRef.current) setRemaining(durationFor(mode))
  }, [durationFor, mode])

  return {
    mode,
    running,
    remainingMs,
    durationMs: durationFor(mode),
    cycleCount,
    todayCount,
    longEvery: settings.longEvery,
    alarmRinging,
    toggle,
    reset,
    skip,
    selectMode,
    stopAlarm: clearAlarm,
    clearToday,
    adjustRemaining,
  }
}
