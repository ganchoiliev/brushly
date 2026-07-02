/* Generates the app icon + splash assets from brand-token SVGs.
   Run from brushly-ar/:  node scripts/generate-assets.mjs
   Uses the site's sharp install (no extra dependency here).

   The mark is a serif "B." — gold on charcoal — matching the site wordmark.
   If the store listing ever gets professionally designed assets, drop them
   over assets/images/ and delete this script. */

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const sharp = require(path.resolve(fileURLToPath(import.meta.url), '../../../node_modules/sharp'))

const OUT = path.resolve(fileURLToPath(import.meta.url), '../../assets/images')

const CHARCOAL = '#151515'
const GOLD = '#C8A96E'
const CREAM = '#F5F0EB'

/* Serif mark. Georgia ships on macOS; fontconfig falls back to any serif —
   the glyph stays on-brand either way. */
function markSvg({ size, bg, glyph = true, glyphFill = CREAM, dotFill = GOLD, scale = 1 }) {
  const font = size * 0.62 * scale
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ''}
  ${
    glyph
      ? `<text x="50%" y="52%" dominant-baseline="central" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="600"
        font-size="${font}" fill="${glyphFill}">B<tspan fill="${dotFill}">.</tspan></text>`
      : ''
  }
</svg>`
}

async function png(svg, file, { width, height } = {}) {
  const image = sharp(Buffer.from(svg), { density: 300 })
  if (width) image.resize(width, height ?? width)
  await image.png().toFile(path.join(OUT, file))
  console.log('wrote', file)
}

// iOS app icon — full-bleed square, no transparency allowed.
await png(markSvg({ size: 1024, bg: CHARCOAL }), 'icon.png')

// Android adaptive foreground — glyph inside the ~66% safe zone, transparent bg.
await png(markSvg({ size: 1024, bg: null, scale: 0.55 }), 'android-icon-foreground.png')

// Android monochrome (themed icons) — single colour glyph, transparent bg.
await png(
  markSvg({ size: 1024, bg: null, scale: 0.55, glyphFill: '#FFFFFF', dotFill: '#FFFFFF' }),
  'android-icon-monochrome.png',
)

// Splash icon — small centred mark on the #151515 splash background.
await png(markSvg({ size: 512, bg: null }), 'splash-icon.png')

// Web favicon.
await png(markSvg({ size: 64, bg: CHARCOAL }), 'favicon.png')

console.log('done — assets in', OUT)
