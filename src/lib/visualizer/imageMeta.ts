/* Lightweight image metadata for the render route: JPEG pixel dimensions
   (every visualiser source is a JPEG — processImage and the AR shutter both
   re-encode) and the closest aspect ratio the Gemini image models accept. */

/** Width/height from a JPEG buffer's SOF marker, or null if unparseable. */
export function jpegDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null
  let pos = 2
  while (pos + 9 < buf.length) {
    if (buf[pos] !== 0xff) return null
    const marker = buf[pos + 1]
    // Standalone markers without a length payload.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      pos += 2
      continue
    }
    const length = buf.readUInt16BE(pos + 2)
    if (length < 2) return null
    // SOF0..SOF15 except DHT(C4)/JPG(C8)/DAC(CC) carry the frame dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(pos + 5), width: buf.readUInt16BE(pos + 7) }
    }
    pos += 2 + length
  }
  return null
}

// Aspect ratios accepted by Gemini image generation.
const SUPPORTED_RATIOS: [string, number][] = [
  ['21:9', 21 / 9],
  ['16:9', 16 / 9],
  ['3:2', 3 / 2],
  ['4:3', 4 / 3],
  ['5:4', 5 / 4],
  ['1:1', 1],
  ['4:5', 4 / 5],
  ['3:4', 3 / 4],
  ['2:3', 2 / 3],
  ['9:16', 9 / 16],
]

/** The supported aspect-ratio string closest to w:h (log-scale distance). */
export function closestAspectRatio(width: number, height: number): string {
  const target = width / height
  let best = '4:3'
  let bestDist = Infinity
  for (const [label, ratio] of SUPPORTED_RATIOS) {
    const dist = Math.abs(Math.log(target / ratio))
    if (dist < bestDist) {
      bestDist = dist
      best = label
    }
  }
  return best
}
