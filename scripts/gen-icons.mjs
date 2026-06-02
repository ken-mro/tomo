// Generates the PWA PNG icons from the tomo mascot, so the app installs with a
// proper home-screen/taskbar icon on every platform. Run via `pnpm gen:icons`
// (also runs automatically before dev/build). Output: public/*.png
import sharp from 'sharp'
import { mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public')

const PEACH = '#FDEAE0'

// The mascot artwork (no background), drawn in a 120×120 coordinate space.
const MASCOT = `
  <ellipse cx="60" cy="66" rx="40" ry="37" fill="#F0564B" stroke="#D8453B" stroke-width="2"/>
  <path d="M60 31 C48 29 37 24 33 17 C45 17 56 23 60 30 Z" fill="#5FB85C"/>
  <path d="M60 31 C72 29 83 24 87 17 C75 17 64 23 60 30 Z" fill="#5FB85C"/>
  <path d="M60 30 L60 19" stroke="#3E9A4A" stroke-width="4" stroke-linecap="round"/>
  <path d="M95 64 Q104 56 102 47" stroke="#D8453B" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="102" cy="45" r="5" fill="#F0564B" stroke="#D8453B" stroke-width="2"/>
  <circle cx="49" cy="63" r="3.2" fill="#3A2A28"/><circle cx="71" cy="63" r="3.2" fill="#3A2A28"/>
  <circle cx="50" cy="62" r="1" fill="#fff"/><circle cx="72" cy="62" r="1" fill="#fff"/>
  <circle cx="43" cy="75" r="5" fill="#FF9B8A" opacity="0.55"/><circle cx="77" cy="75" r="5" fill="#FF9B8A" opacity="0.55"/>
  <path d="M48 75 Q60 87 72 75" fill="none" stroke="#3A2A28" stroke-width="2.6" stroke-linecap="round"/>
`

/**
 * Compose a square icon SVG.
 * @param {object} o
 * @param {string|null} o.bg     background fill ("none" = transparent)
 * @param {number} o.scale       mascot scale around its center (1 = fills the 120 box)
 * @param {number} o.rx          background corner radius (0 = square, for maskable/apple)
 */
function iconSvg({ bg, scale, rx }) {
  const bgRect = bg === 'none' ? '' : `<rect width="120" height="120" rx="${rx}" fill="${bg}"/>`
  // Scale the mascot around the tomato's visual center (~60, 62).
  const group = `<g transform="translate(60 62) scale(${scale}) translate(-60 -62)">${MASCOT}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">${bgRect}${group}</svg>`
}

const targets = [
  // Standard "any" icons — rounded peach tile, mascot near full size.
  { file: 'pwa-192.png', size: 192, svg: iconSvg({ bg: PEACH, scale: 0.92, rx: 26 }) },
  { file: 'pwa-512.png', size: 512, svg: iconSvg({ bg: PEACH, scale: 0.92, rx: 26 }) },
  // Maskable — full-bleed peach square, mascot inside the ~80% safe zone.
  { file: 'maskable-512.png', size: 512, svg: iconSvg({ bg: PEACH, scale: 0.7, rx: 0 }) },
  // Apple touch icon — opaque square (iOS rounds the corners itself).
  { file: 'apple-touch-icon.png', size: 180, svg: iconSvg({ bg: PEACH, scale: 0.78, rx: 0 }) },
]

const allPresent = targets.every((t) => existsSync(join(OUT, t.file)))
if (allPresent && !process.argv.includes('--force')) {
  console.log('[gen-icons] all icons already present, skipping.')
  process.exit(0)
}

mkdirSync(OUT, { recursive: true })
for (const t of targets) {
  await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(join(OUT, t.file))
  console.log(`[gen-icons] wrote ${t.file}`)
}
