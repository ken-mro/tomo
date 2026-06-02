import { useRef } from 'react'

// Vertical drag distance (px) that equals one minute of adjustment.
const PX_PER_MIN = 12

export interface DragHandlers {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}

/**
 * Drag vertically (up = more, down = less) to adjust a time value in
 * whole-minute steps. Only active while `enabled` (e.g. the timer is paused).
 * `baseMs` is captured at drag start so the adjustment is relative and stable;
 * `onChange` receives the new absolute time in ms.
 */
export function useTimeDrag(enabled: boolean, baseMs: number, onChange: (ms: number) => void): DragHandlers {
  const start = useRef<{ y: number; base: number } | null>(null)

  return {
    onPointerDown: (e) => {
      if (!enabled) return
      start.current = { y: e.clientY, base: baseMs }
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    onPointerMove: (e) => {
      const s = start.current
      if (!s) return
      const deltaMin = Math.round((s.y - e.clientY) / PX_PER_MIN)
      if (deltaMin !== 0) onChange(s.base + deltaMin * 60_000)
    },
    onPointerUp: (e) => {
      start.current = null
      ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    },
  }
}
