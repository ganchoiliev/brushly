import { deflateSync } from 'node:zlib'

/* Server-side solid-colour swatch PNG, dependency-free.

   Why it exists: the render prompt used to convey the target paint colour as
   hex TEXT — and image models are notoriously loose about mapping "#313E43"
   to pixels, which matters when Hague Blue vs Stiffkey Blue is the product.
   Sending a rendered swatch as a second image part pins the colour down.

   Minimal PNG: 8-bit RGB (colour type 2), one IDAT deflated with node:zlib,
   CRC32 per chunk. ~200 bytes for any size. */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(...buffers: Buffer[]): number {
  let crc = 0xffffffff
  for (const buf of buffers) {
    for (let i = 0; i < buf.length; i++) {
      crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeBuf, data))
  return Buffer.concat([len, typeBuf, data, crc])
}

/** Solid-colour RGB PNG of `size`×`size` for a '#RRGGBB' hex. */
export function solidSwatchPng(hex: string, size = 128): Buffer {
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  // compression/filter/interlace all 0

  // Each scanline: filter byte 0 + RGB pixels.
  const raw = Buffer.alloc(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3)
    for (let x = 0; x < size; x++) {
      const p = row + 1 + x * 3
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
