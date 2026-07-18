import { afterEach, describe, expect, it, vi } from 'vitest'
import { isLiveCapable } from './liveCapability'

type Cam = { kind: string; label: string }

const cam = (label = ''): Cam => ({ kind: 'videoinput', label })

function stubEnv({
  touchPoints = 0,
  coarsePrimary = false,
  devices = [cam()] as Cam[] | 'reject',
  hasGetUserMedia = true,
}: {
  touchPoints?: number
  coarsePrimary?: boolean
  devices?: Cam[] | 'reject'
  hasGetUserMedia?: boolean
}) {
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: coarsePrimary }),
  })
  vi.stubGlobal('navigator', {
    maxTouchPoints: touchPoints,
    mediaDevices: hasGetUserMedia
      ? {
          getUserMedia: () => Promise.reject(new Error('never called by the check')),
          enumerateDevices: () =>
            devices === 'reject'
              ? Promise.reject(new Error('blocked'))
              : Promise.resolve(devices),
        }
      : undefined,
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('isLiveCapable', () => {
  it('is false during SSR (no window)', async () => {
    expect(await isLiveCapable()).toBe(false)
  })

  it('is false without getUserMedia (insecure context / ancient browser)', async () => {
    stubEnv({ touchPoints: 5, coarsePrimary: true, hasGetUserMedia: false })
    expect(await isLiveCapable()).toBe(false)
  })

  it('is false on a desktop (no touch, fine pointer, webcam present)', async () => {
    stubEnv({ devices: [cam()] })
    expect(await isLiveCapable()).toBe(false)
  })

  it('is false on a touchscreen laptop (touch points but fine primary pointer)', async () => {
    stubEnv({ touchPoints: 10, coarsePrimary: false, devices: [cam(), cam()] })
    expect(await isLiveCapable()).toBe(false)
  })

  it('is false even with a granted rear-labelled camera when the device is not touch-first', async () => {
    stubEnv({ devices: [cam('USB Rear Camera')] })
    expect(await isLiveCapable()).toBe(false)
  })

  it('is true on a phone before camera permission (labels hidden)', async () => {
    stubEnv({ touchPoints: 5, coarsePrimary: true, devices: [cam()] })
    expect(await isLiveCapable()).toBe(true)
  })

  it('is true on a phone after permission with a labelled back camera', async () => {
    stubEnv({
      touchPoints: 5,
      coarsePrimary: true,
      devices: [cam('Front Camera'), cam('Back Camera')],
    })
    expect(await isLiveCapable()).toBe(true)
  })

  it('is true on a touch device with two cameras and unhelpful labels', async () => {
    stubEnv({ touchPoints: 5, coarsePrimary: true, devices: [cam('Camera 0'), cam('Camera 1')] })
    expect(await isLiveCapable()).toBe(true)
  })

  it('is false on a touch device whose only labelled camera faces the user', async () => {
    stubEnv({ touchPoints: 5, coarsePrimary: true, devices: [cam('Front Camera')] })
    expect(await isLiveCapable()).toBe(false)
  })

  it('is false on a touch device with no camera at all', async () => {
    stubEnv({
      touchPoints: 5,
      coarsePrimary: true,
      devices: [{ kind: 'audioinput', label: '' }],
    })
    expect(await isLiveCapable()).toBe(false)
  })

  it('trusts the touch signal when enumerateDevices fails', async () => {
    stubEnv({ touchPoints: 5, coarsePrimary: true, devices: 'reject' })
    expect(await isLiveCapable()).toBe(true)
  })
})
