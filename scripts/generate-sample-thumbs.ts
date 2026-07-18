/* Regenerates the visualizer wizard's sample-room button thumbnails from the
   full-size photos in public/img. The buttons render at ~107×80 css px
   (grid-cols-3, h-20), so 320×240 covers 3× device pixel ratios.

   Run: npx tsx scripts/generate-sample-thumbs.ts */
import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const IMG_DIR = path.join(process.cwd(), 'public/img')
const OUT_DIR = path.join(IMG_DIR, 'samples')
const SOURCES = ['interior', 'modern_kitchen', 'hallway']

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  for (const name of SOURCES) {
    const out = path.join(OUT_DIR, `${name}-thumb.webp`)
    await sharp(path.join(IMG_DIR, `${name}.webp`))
      .resize({ width: 320, height: 240, fit: 'cover' })
      .webp({ quality: 72 })
      .toFile(out)
    console.log('wrote', out)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
