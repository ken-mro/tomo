import { useEffect, useRef } from 'react'

type WakeLockSentinelLike = { release: () => Promise<void> }
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }

/**
 * Hold a screen wake lock while `active` so the display doesn't sleep (e.g. while
 * a timer runs). The lock is auto-released by the OS when the tab is hidden, so
 * we re-acquire it when the page becomes visible again. No-op where unsupported.
 */
export function useWakeLock(active: boolean): void {
  const sentinel = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    const nav = navigator as WakeLockNavigator
    if (!active || !nav.wakeLock) return
    let cancelled = false

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible' || sentinel.current) return
      try {
        sentinel.current = await nav.wakeLock!.request('screen')
      } catch {
        /* request can reject (e.g. low battery) — nothing to do */
      }
    }
    const onVisible = () => {
      // The OS releases the lock when hidden; re-acquire once we're visible again.
      sentinel.current = null
      void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      const s = sentinel.current
      sentinel.current = null
      if (s) void s.release().catch(() => {})
    }
  }, [active])
}
