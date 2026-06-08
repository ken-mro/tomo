// Schedules the end-of-interval alarm on the Web Audio clock so it can fire even
// when the screen is off / the tab is backgrounded (where setTimeout/setInterval
// are throttled).
//
// To survive the screen being locked on Android, a near-silent keepalive needs
// to look like real media playback: we loop a silent <audio> element and publish
// a MediaSession, the same trick music/podcast PWAs use to keep audio alive in
// the background. A Web Audio keepalive source is also kept running so the
// AudioContext doesn't get suspended. This is best-effort: some platforms
// (notably iOS Safari) may still suspend background audio, so the foreground
// HTMLAudio path remains as a fallback.
import { resolveSound } from './sounds'
import { CUSTOM_SOUND_ID } from '../types'

type Ctx = AudioContext

let ctx: Ctx | null = null
let waKeepAlive: AudioBufferSourceNode | null = null
let media: HTMLAudioElement | null = null
let silentUri = ''
let scheduled: AudioBufferSourceNode | null = null
// Epoch ms the scheduled alarm fires, so we can tell "already playing" from "still pending".
let scheduledEndMs = 0
// AudioContext time the scheduled source actually starts producing sound. Used to
// tell "this alarm has been audibly ringing for a while" (we refocused mid-alarm)
// from "it just reached the boundary" — purely on the audio clock, no wall-clock.
let scheduledStartTime = 0
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

// A tiny WAV of (essentially) silence, as a data URI, for the media-element
// keepalive. The samples are a hair above zero so the platform treats the
// element as producing audio rather than optimising it away as pure silence.
function silentWavUri(): string {
  if (silentUri) return silentUri
  const sampleRate = 8000
  const samples = sampleRate // 1 second, looped
  const dataSize = samples * 2 // 16-bit mono
  const buf = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buf)
  const str = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  str(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  str(36, 'data')
  view.setUint32(40, dataSize, true)
  for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, 4, true) // ~-78 dB, inaudible but non-zero
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  silentUri = 'data:audio/wav;base64,' + btoa(bin)
  return silentUri
}

function startKeepAlive() {
  // Media-element + MediaSession keepalive — this is what keeps audio alive with
  // the screen locked on Android.
  if (!media) {
    const el = new Audio(silentWavUri())
    el.loop = true
    el.preload = 'auto'
    media = el
  }
  void media.play().catch(() => {})
  if ('mediaSession' in navigator) {
    try {
      const md = (window as unknown as { MediaMetadata?: typeof MediaMetadata }).MediaMetadata
      if (md) navigator.mediaSession.metadata = new md({ title: 'tomo', artist: 'Focus timer' })
      navigator.mediaSession.playbackState = 'playing'
      navigator.mediaSession.setActionHandler('play', () => void media?.play().catch(() => {}))
      navigator.mediaSession.setActionHandler('pause', () => {})
    } catch {
      /* MediaSession is optional */
    }
  }
  // Web Audio keepalive so the AudioContext keeps rendering the scheduled alarm.
  const c = getCtx()
  if (c && !waKeepAlive) {
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, c.sampleRate, c.sampleRate)
    src.loop = true
    const g = c.createGain()
    g.gain.value = 0.0001
    src.connect(g).connect(c.destination)
    try {
      src.start()
    } catch {
      /* already started */
    }
    waKeepAlive = src
  }
}

function stopKeepAlive() {
  if (media) {
    try {
      media.pause()
    } catch {
      /* ignore */
    }
    media.removeAttribute('src')
    media = null
  }
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.playbackState = 'none'
      navigator.mediaSession.metadata = null
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
    } catch {
      /* ignore */
    }
  }
  if (waKeepAlive) {
    try {
      waKeepAlive.stop()
    } catch {
      /* ignore */
    }
    try {
      waKeepAlive.disconnect()
    } catch {
      /* ignore */
    }
    waKeepAlive = null
  }
}

/**
 * Create/resume the AudioContext and start the background keepalive from within a
 * user gesture (e.g. Start), so audio can later play with the screen off.
 */
export function primeAlarmAudio(): void {
  const c = getCtx()
  if (!c) return // no Web Audio support: background scheduling can't work, so don't publish a media session
  if (c.state === 'suspended') void c.resume().catch(() => {})
  startKeepAlive()
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

/**
 * Whether the scheduled alarm has been audibly ringing for a moment already —
 * true only once its sound started a half-second ago. Lets the foreground path
 * leave an in-progress alarm alone (e.g. we refocused mid-alarm) instead of
 * cutting it off and restarting it, while still treating a just-reached boundary
 * as "not yet ringing" so it can be replaced with an accurate immediate play.
 */
export function isAlarmFiring(): boolean {
  return scheduled != null && ctx != null && ctx.currentTime - scheduledStartTime > 0.5
}

/**
 * Play the alarm immediately on the audio clock using the already-decoded buffer.
 * Returns false (so the caller can fall back to HTMLAudio) when no context or
 * cached buffer is ready — e.g. background audio is disabled, or a custom sound
 * (which isn't pre-decoded) is selected. Firing "now" carries no decode latency
 * and no scheduling drift, so the foreground alarm lands on the wall-clock moment
 * the interval ended. Reuses the `scheduled` slot so the existing stop paths
 * (silenceAlarm / the alarm-clear effect) tear it down unchanged.
 */
export function playAlarmNow(soundId: string, volume: number): boolean {
  const c = ctx
  if (!c) return false
  const buf = soundId === CUSTOM_SOUND_ID ? undefined : buffers.get(soundId)
  if (!buf) return false
  if (c.state === 'suspended') void c.resume().catch(() => {})
  clearScheduled(true)
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.value = Math.max(0, Math.min(1, volume))
  src.connect(g).connect(c.destination)
  src.onended = () => {
    if (scheduled === src) {
      scheduled = null
      armed = false
    }
  }
  src.start()
  scheduled = src
  scheduledEndMs = Date.now() // already firing
  scheduledStartTime = c.currentTime
  armed = true
  return true
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
    startKeepAlive()
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
    scheduledStartTime = when
    armed = true
  } catch {
    armed = false
  }
}

/**
 * Arm the alarm `delayMs` from now (default 10s) so the user can lock the screen
 * and verify background playback quickly. Returns the delay actually used.
 */
export function testAlarm(soundId: string, volume: number, delayMs = 10000): number {
  primeAlarmAudio()
  void armAlarm(soundId, volume, Date.now() + delayMs)
  // armAlarm bumped `token` synchronously; if nothing else arms/disarms before the
  // test finishes, tidy up the keepalive so a one-off test doesn't loop forever.
  const mine = token
  window.setTimeout(() => {
    if (token === mine) disarmAlarm()
  }, delayMs + 4000)
  return delayMs
}

/** Stop a playing or pending scheduled alarm (e.g. the Stop button), leaving the keepalive in place. */
export function silenceAlarm(): void {
  clearScheduled(true)
  // Nothing is scheduled anymore. Clear `armed` explicitly: clearScheduled nulls
  // `scheduled`, which defeats the source's onended cleanup (its `scheduled === src`
  // check no longer matches), so it can't reset `armed` for us.
  armed = false
}

/** Cancel a pending alarm (lets a just-fired one finish) and let the keepalive idle. */
export function disarmAlarm(): void {
  token++
  armed = false
  clearScheduled(false)
  stopKeepAlive()
}
