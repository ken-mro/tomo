import { useRef } from 'react'

// The compact landscape layout (must match the media query in styles.css).
const LANDSCAPE_QUERY = '(orientation: landscape) and (max-height: 560px)'
// Minimum horizontal travel to count as a swipe, and it must be clearly more
// horizontal than vertical so it doesn't fight scrolling / taps.
const THRESHOLD = 45

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

/**
 * Horizontal swipe navigation. `onPrev`/`onNext` fire on a right/left swipe.
 * In the compact landscape layout, swipes that begin on the timer ring (the
 * left section) are ignored so only the right section is swipe-sensitive.
 */
export function useSwipeNav(onPrev: () => void, onNext: () => void): SwipeHandlers {
  const start = useRef<{ x: number; y: number; ignore: boolean } | null>(null)

  return {
    onTouchStart: (e) => {
      const touch = e.changedTouches[0]
      let ignore = false
      if (window.matchMedia(LANDSCAPE_QUERY).matches) {
        ignore = !!(e.target as HTMLElement).closest('.timer-stage')
      }
      start.current = { x: touch.clientX, y: touch.clientY, ignore }
    },
    onTouchEnd: (e) => {
      const s = start.current
      start.current = null
      if (!s || s.ignore) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - s.x
      const dy = touch.clientY - s.y
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return
      if (dx < 0) onNext()
      else onPrev()
    },
  }
}
