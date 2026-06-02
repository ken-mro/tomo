// Notification helpers. Permission is requested on the first Start (a genuine
// user gesture), not on page load, per the spec.

export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined'
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission === 'default') {
    try {
      return await Notification.requestPermission()
    } catch {
      return Notification.permission
    }
  }
  return Notification.permission
}

/**
 * Show a "time's up" notification. Clicking it focuses the app window — this
 * works because the click is a real user gesture.
 */
export function showTimesUpNotification(title: string, body: string, icon: string): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, icon, tag: 'tomo-timer', renotify: true } as NotificationOptions)
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    /* some platforms throw if constructed outside a SW — non-fatal */
  }
}
