import { useRef } from 'react'

// One full turn around the ring adjusts the time by this many minutes.
const MINUTES_PER_REVOLUTION = 60

export interface DialHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}

/**
 * Drag around the ring like a dial to adjust a time value. Clockwise adds time,
 * counter-clockwise removes it (one full turn = MINUTES_PER_REVOLUTION minutes),
 * snapped to whole minutes. Only active while `enabled` (e.g. the timer is
 * paused). `baseMs` is captured at drag start so the change is relative and
 * stable; `onChange` receives the new absolute time in ms.
 */
export function useRingDial(enabled: boolean, baseMs: number, onChange: (ms: number) => void): DialHandlers {
  const drag = useRef<{ cx: number; cy: number; last: number; base: number; total: number } | null>(null)

  const angle = (e: React.PointerEvent, cx: number, cy: number) => Math.atan2(e.clientY - cy, e.clientX - cx)

  return {
    onPointerDown: (e) => {
      if (!enabled) return
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      drag.current = { cx, cy, last: angle(e, cx, cy), base: baseMs, total: 0 }
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    onPointerMove: (e) => {
      const d = drag.current
      if (!d) return
      const a = angle(e, d.cx, d.cy)
      // Per-move delta, unwrapped across the ±180° seam (screen-y grows down, so
      // a clockwise drag yields a positive delta → adds time).
      let step = a - d.last
      if (step > Math.PI) step -= 2 * Math.PI
      else if (step < -Math.PI) step += 2 * Math.PI
      d.total += step
      d.last = a
      const minutes = Math.round((d.total / (2 * Math.PI)) * MINUTES_PER_REVOLUTION)
      onChange(d.base + minutes * 60_000)
    },
    onPointerUp: (e) => {
      // Only release if a drag was actually in progress — releasing a pointer
      // that was never captured (e.g. pointerdown returned early) throws.
      if (!drag.current) return
      drag.current = null
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
      } catch {
        /* pointer wasn't captured — nothing to release */
      }
    },
  }
}
