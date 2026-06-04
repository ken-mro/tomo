// Schedules the end-of-interval alarm on the Web Audio clock so it can fire even
// when the screen is off / the tab is backgrounded (where setTimeout/setInterval
// are throttled). A near-silent keepalive loop keeps the AudioContext running in
// the background. This is best-effort: some platforms (notably iOS Safari) may
// still suspend background audio, so the foreground HTMLAudio path remains as a
// fallback.
import { resolveSound } from './sounds'
import { CUSTOM_SOUND_ID } from '../types'

type Ctx = AudioContext

let ctx: Ctx | null = null
let keepAlive: AudioBufferSourceNode | null = null
let scheduled: AudioBufferSourceNode | null = null
// Epoch ms the scheduled alarm fires, so we can tell "already playing" from "still pending".
let scheduledEndMs = 0
// Increments on every arm/disarm so a slow async decode can't schedule a stale alarm.
let token = 0
let armed = false
const buffers = new Map<string, AudioBuffer>()

function getCtx(): Ctx | null {
  if (ctx) return ctx
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  return ctx
}

/** Create/resume the AudioContext from within a user gesture (e.g. Start) so later background scheduling is allowed. */
export function primeAlarmAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume().catch(() => {})
}

async function decodeFor(c: Ctx, id: string): Promise<AudioBuffer | null> {
  if (id !== CUSTOM_SOUND_ID) {
    const cached = buffers.get(id)
    if (cached) return cached
  }
  const resolved = await resolveSound(id)
  if (!resolved) return null
  try {
    const arr = await (await fetch(resolved.url)).arrayBuffer()
    const buf = await c.decodeAudioData(arr)
    if (id !== CUSTOM_SOUND_ID) buffers.set(id, buf)
    return buf
  } finally {
    if (resolved.temporary) URL.revokeObjectURL(resolved.url)
  }
}

function ensureKeepAlive(c: Ctx) {
  if (keepAlive) return
  const src = c.createBufferSource()
  src.buffer = c.createBuffer(1, c.sampleRate, c.sampleRate)
  src.loop = true
  const g = c.createGain()
  g.gain.value = 0.0001 // inaudible, but non-zero so the context keeps rendering in the background
  src.connect(g).connect(c.destination)
  try {
    src.start()
  } catch {
    /* already started — ignore */
  }
  keepAlive = src
}

// Drop the scheduled alarm. By default an alarm that has already started firing
// is left to play out (cutting it off would truncate the sound on completion);
// pass force=true to stop it even mid-playback (the Stop button).
function clearScheduled(force = false) {
  if (!scheduled) return
  const firing = Date.now() >= scheduledEndMs
  if (force || !firing) {
    try {
      scheduled.stop()
    } catch {
      /* not started / already stopped */
    }
    try {
      scheduled.disconnect()
    } catch {
      /* already disconnected */
    }
  }
  scheduled = null
}

/** Whether an alarm is currently scheduled (so the foreground fallback can skip playing). */
export function isAlarmArmed(): boolean {
  return armed
}

/** Schedule the alarm to fire at `endTimeMs` (epoch ms), keeping the context alive until then. */
export async function armAlarm(soundId: string, volume: number, endTimeMs: number): Promise<void> {
  const mine = ++token
  armed = false
  const c = getCtx()
  if (!c) return
  try {
    if (c.state === 'suspended') await c.resume()
    const buf = await decodeFor(c, soundId)
    if (!buf || mine !== token) return // superseded or failed
    clearScheduled()
    ensureKeepAlive(c)
    const when = c.currentTime + Math.max(0, (endTimeMs - Date.now()) / 1000)
    const src = c.createBufferSource()
    src.buffer = buf
    const g = c.createGain()
    g.gain.value = Math.max(0, Math.min(1, volume))
    src.connect(g).connect(c.destination)
    // Once the alarm has played out, drop it and clear `armed` so a late-running
    // (e.g. background-throttled) interval-end callback falls back to the
    // foreground alarm instead of staying silent. By then the sound has finished,
    // so there's no simultaneous double alarm.
    src.onended = () => {
      if (scheduled === src) {
        scheduled = null
        armed = false
      }
    }
    src.start(when)
    scheduled = src
    scheduledEndMs = endTimeMs
    armed = true
  } catch {
    armed = false
  }
}

/** Stop a playing or pending scheduled alarm (e.g. the Stop button), leaving the keepalive in place. */
export function silenceAlarm(): void {
  clearScheduled(true)
}

/** Cancel a pending alarm (lets a just-fired one finish) and let the AudioContext idle. */
export function disarmAlarm(): void {
  token++
  armed = false
  clearScheduled(false)
  if (keepAlive) {
    try {
      keepAlive.stop()
    } catch {
      /* ignore */
    }
    try {
      keepAlive.disconnect()
    } catch {
      /* ignore */
    }
    keepAlive = null
  }
}
