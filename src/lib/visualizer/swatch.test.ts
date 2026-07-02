import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { solidSwatchPng } from './swatch'

/** Pull one chunk's data out of a PNG buffer by type. */
function chunkData(png: Buffer, type: string): Buffer | null {
  let pos = 8
  while (pos + 8 <= png.length) {
    const len = png.readUInt32BE(pos)
    const t = png.subarray(pos + 4, pos + 8).toString('ascii')
    if (t === type) return png.subarray(pos + 8, pos + 8 + len)
    pos += 12 + len
  }
  return null
}

describe('solidSwatchPng', () => {
  it('produces a structurally valid PNG with the right dimensions', () => {
    const png = solidSwatchPng('#313E43', 64)
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const ihdr = chunkData(png, 'IHDR')
    expect(ihdr).not.toBeNull()
    expect(ihdr!.readUInt32BE(0)).toBe(64)
    expect(ihdr!.readUInt32BE(4)).toBe(64)
    expect(ihdr![8]).toBe(8) // bit depth
    expect(ihdr![9]).toBe(2) // truecolour
    expect(chunkData(png, 'IEND')).not.toBeNull()
  })

  it('encodes exactly the requested colour in every pixel', () => {
    const png = solidSwatchPng('#C8A96E', 8)
    const idat = chunkData(png, 'IDAT')
    expect(idat).not.toBeNull()
    const raw = inflateSync(idat!)
    expect(raw.length).toBe(8 * (1 + 8 * 3))
    for (let y = 0; y < 8; y++) {
      const row = y * (1 + 8 * 3)
      expect(raw[row]).toBe(0) // filter byte
      for (let x = 0; x < 8; x++) {
        const p = row + 1 + x * 3
        expect([raw[p], raw[p + 1], raw[p + 2]]).toEqual([0xc8, 0xa9, 0x6e])
      }
    }
  })
})
