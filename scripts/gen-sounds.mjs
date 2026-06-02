// Generates the four built-in alarm sounds as royalty-free, synthesized WAV files.
// Run automatically before `dev`/`build` (see package.json), or via `pnpm gen:sounds`.
// Output: public/sounds/{bell,digital,chime,gentle}.wav
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'sounds')
const SAMPLE_RATE = 44100

// --- tiny synthesis helpers ---------------------------------------------------

function makeBuffer(seconds) {
  return new Float32Array(Math.ceil(seconds * SAMPLE_RATE))
}

// Add a decaying sine partial into `buf` starting at time `start` (seconds).
function addTone(buf, { freq, start = 0, dur, gain = 0.4, decay = 6, attack = 0.005, type = 'sine' }) {
  const n0 = Math.floor(start * SAMPLE_RATE)
  const n1 = Math.min(buf.length, Math.floor((start + dur) * SAMPLE_RATE))
  for (let n = n0; n < n1; n++) {
    const t = (n - n0) / SAMPLE_RATE
    const env = (1 - Math.exp(-t / attack)) * Math.exp(-t * decay)
    const phase = 2 * Math.PI * freq * t
    let s
    switch (type) {
      case 'square':
        s = Math.sign(Math.sin(phase))
        break
      case 'triangle':
        s = (2 / Math.PI) * Math.asin(Math.sin(phase))
        break
      default:
        s = Math.sin(phase)
    }
    buf[n] += s * gain * env
  }
}

// Normalize to a comfortable peak and write a 16-bit PCM mono WAV.
function writeWav(name, buf) {
  let peak = 0
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]))
  const norm = peak > 0 ? 0.85 / peak : 1

  const data = Buffer.alloc(buf.length * 2)
  for (let i = 0; i < buf.length; i++) {
    const v = Math.max(-1, Math.min(1, buf[i] * norm))
    data.writeInt16LE((v * 32767) | 0, i * 2)
  }

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // PCM chunk size
  header.writeUInt16LE(1, 20) // PCM format
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28) // byte rate
  header.writeUInt16LE(2, 32) // block align
  header.writeUInt16LE(16, 34) // bits per sample
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)

  writeFileSync(join(OUT_DIR, name), Buffer.concat([header, data]))
}

// --- the four sounds ----------------------------------------------------------

function bell() {
  // Struck bell: inharmonic partials with long decay, rung twice.
  const buf = makeBuffer(2.2)
  const partials = [
    { mult: 1, gain: 0.5, decay: 3 },
    { mult: 2.76, gain: 0.3, decay: 4 },
    { mult: 5.4, gain: 0.18, decay: 6 },
    { mult: 8.9, gain: 0.1, decay: 9 },
  ]
  for (const start of [0, 0.9]) {
    for (const p of partials) {
      addTone(buf, { freq: 660 * p.mult, start, dur: 1.3, gain: p.gain, decay: p.decay })
    }
  }
  return buf
}

function digital() {
  // Crisp triple beep, like a classic kitchen timer.
  const buf = makeBuffer(1.3)
  for (const start of [0, 0.25, 0.5]) {
    addTone(buf, { freq: 1760, start, dur: 0.16, gain: 0.5, decay: 18, type: 'square' })
    addTone(buf, { freq: 1760, start, dur: 0.16, gain: 0.18, decay: 18 })
  }
  return buf
}

function chime() {
  // Gentle ascending arpeggio (C–E–G–C major).
  const buf = makeBuffer(2.4)
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    addTone(buf, { freq: f, start: i * 0.22, dur: 1.6, gain: 0.4, decay: 2.6, attack: 0.01 })
    addTone(buf, { freq: f * 2, start: i * 0.22, dur: 1.0, gain: 0.12, decay: 4 })
  })
  return buf
}

function gentle() {
  // Soft two-note pad with slow attack — calm and non-startling.
  const buf = makeBuffer(2.6)
  for (const [f, start] of [[440, 0], [587.33, 0.7]]) {
    addTone(buf, { freq: f, start, dur: 1.8, gain: 0.4, decay: 1.6, attack: 0.08 })
    addTone(buf, { freq: f * 1.5, start, dur: 1.8, gain: 0.12, decay: 1.8, attack: 0.08 })
  }
  return buf
}

// --- run ----------------------------------------------------------------------

const sounds = { bell, digital, chime, gentle }

// Skip work if everything already exists (keeps predev/prebuild fast).
const allPresent = Object.keys(sounds).every((n) => existsSync(join(OUT_DIR, `${n}.wav`)))
if (allPresent && !process.argv.includes('--force')) {
  console.log('[gen-sounds] all alarm sounds already present, skipping.')
  process.exit(0)
}

mkdirSync(OUT_DIR, { recursive: true })
for (const [name, fn] of Object.entries(sounds)) {
  writeWav(`${name}.wav`, fn())
  console.log(`[gen-sounds] wrote ${name}.wav`)
}
