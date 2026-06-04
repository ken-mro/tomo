import type { BuiltInSound } from '../types'
import { CUSTOM_SOUND_ID } from '../types'
import { loadCustomSound } from './idb'

export const BUILT_IN_SOUNDS: BuiltInSound[] = [
  { id: 'bell', src: './sounds/bell.wav' },
  { id: 'digital', src: './sounds/digital.wav' },
  { id: 'chime', src: './sounds/chime.wav' },
  { id: 'gentle', src: './sounds/gentle.wav' },
]

const FALLBACK_ID = 'bell'

interface ResolvedSound {
  url: string
  /** True for an object URL we created and must revoke after playback. */
  temporary: boolean
}

/** Resolve a sound id to a playable URL, loading the custom blob from IndexedDB if needed. */
export async function resolveSound(id: string): Promise<ResolvedSound | null> {
  if (id === CUSTOM_SOUND_ID) {
    const custom = await loadCustomSound()
    // Custom sound chosen but the blob is gone (e.g. cleared / different profile):
    // fall back to a built-in so the alarm is never silent.
    if (custom) return { url: URL.createObjectURL(custom.blob), temporary: true }
  }
  const builtIn =
    BUILT_IN_SOUNDS.find((s) => s.id === id) ?? BUILT_IN_SOUNDS.find((s) => s.id === FALLBACK_ID)
  return builtIn ? { url: builtIn.src, temporary: false } : null
}

/**
 * Play the chosen alarm once. Audio is triggered by an earlier user gesture
 * (clicking Start), so autoplay restrictions generally don't apply here.
 * Returns the Audio element so callers can stop a long alarm early. Any object
 * URL we create is revoked once playback ends, so nothing leaks.
 */
export async function playAlarm(id: string, volume: number): Promise<HTMLAudioElement | null> {
  const resolved = await resolveSound(id)
  if (!resolved) return null
  const audio = new Audio(resolved.url)
  audio.volume = Math.max(0, Math.min(1, volume))
  if (resolved.temporary) {
    const revoke = () => URL.revokeObjectURL(resolved.url)
    audio.addEventListener('ended', revoke, { once: true })
    audio.addEventListener('error', revoke, { once: true })
  }
  try {
    await audio.play()
  } catch {
    /* blocked by autoplay policy — nothing we can do without a gesture */
  }
  return audio
}

// --- ticking ------------------------------------------------------------------
// A soft, low-CPU tick generated with the Web Audio API (no asset needed).
let tickCtx: AudioContext | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null

export function startTicking(volume: number): void {
  stopTicking()
  tickCtx = new AudioContext()
  const ctx = tickCtx
  const tick = () => {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 1200
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.15), t + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.06)
  }
  tick()
  tickTimer = setInterval(tick, 1000)
}

export function stopTicking(): void {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = null
  if (tickCtx) {
    tickCtx.close().catch(() => {})
    tickCtx = null
  }
}
