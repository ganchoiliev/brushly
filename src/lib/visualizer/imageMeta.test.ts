import { describe, expect, it } from 'vitest'
import { closestAspectRatio, jpegDimensions } from './imageMeta'

/** Minimal synthetic JPEG: SOI, APP0, SOF0 with the given dimensions. */
function fakeJpeg(width: number, height: number, sofMarker = 0xc0): Buffer {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0)])
  const sof = Buffer.alloc(2 + 2 + 7)
  sof[0] = 0xff
  sof[1] = sofMarker
  sof.writeUInt16BE(9, 2) // segment length
  sof[4] = 8 // precision
  sof.writeUInt16BE(height, 5)
  sof.writeUInt16BE(width, 7)
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof])
}

describe('jpegDimensions', () => {
  it('reads width/height from SOF0 and progressive SOF2', () => {
    expect(jpegDimensions(fakeJpeg(1600, 1200))).toEqual({ width: 1600, height: 1200 })
    expect(jpegDimensions(fakeJpeg(1080, 1920, 0xc2))).toEqual({ width: 1080, height: 1920 })
  })

  it('returns null for non-JPEG data', () => {
    expect(jpegDimensions(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull()
    expect(jpegDimensions(Buffer.alloc(0))).toBeNull()
  })

  it('does not mistake DHT (0xC4) for a frame header', () => {
    const dht = Buffer.from([0xff, 0xc4, 0x00, 0x08, 0, 0, 0, 0, 0, 0])
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), dht, fakeJpeg(640, 480).subarray(2)])
    expect(jpegDimensions(jpeg)).toEqual({ width: 640, height: 480 })
  })
})

describe('closestAspectRatio', () => {
  it('maps common photo shapes to the supported set', () => {
    expect(closestAspectRatio(1600, 1200)).toBe('4:3')
    expect(closestAspectRatio(1200, 1600)).toBe('3:4')
    expect(closestAspectRatio(1920, 1080)).toBe('16:9')
    expect(closestAspectRatio(1080, 1920)).toBe('9:16')
    expect(closestAspectRatio(1000, 1000)).toBe('1:1')
    // Between 4:3 (1.333) and 3:2 (1.5): log-distance favours 4:3 for 1.4…
    expect(closestAspectRatio(1400, 1000)).toBe('4:3')
    // …and 3:2 for 1.45.
    expect(closestAspectRatio(1450, 1000)).toBe('3:2')
  })
})
