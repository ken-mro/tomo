/** Format milliseconds as M:SS (or MM:SS), rounding up so "0:01" shows for the final second. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
