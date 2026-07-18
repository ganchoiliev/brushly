// Click-time gate for the live AR camera. The live path is a phone feature:
// on a desktop the 'environment' getUserMedia constraint silently falls back
// to the user-facing webcam, which points at a face, not a wall. "Live
// capable" therefore means a primary-touch device that has an
// environment-facing camera as far as we can tell without prompting for
// camera permission — judged from real device signals (pointer media queries,
// touch points, media devices), never the user agent string.
export async function isLiveCapable(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false

  // Primary input must be touch. Touchscreen laptops keep a fine,
  // hover-capable primary pointer, so they fail here — their webcam faces
  // the user too.
  const touchPrimary =
    navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none) and (pointer: coarse)').matches
  if (!touchPrimary) return false

  try {
    const cams = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === 'videoinput',
    )
    if (cams.length === 0) return false
    // Device labels are only readable once camera permission has been
    // granted; when they are, believe them over any heuristic. Two cameras on
    // a touch device means front + back even when the labels are unhelpful.
    const labels = cams.map((c) => c.label).filter(Boolean)
    if (labels.length > 0) {
      return labels.some((l) => /back|rear|environment/i.test(l)) || cams.length > 1
    }
    // Permission not granted yet, so labels are hidden (and some browsers
    // collapse the device list to one entry): a touch-first device with any
    // camera is a phone or tablet in the overwhelming case.
    return true
  } catch {
    // enumerateDevices failed — the touch signal alone still beats sending a
    // phone user to the QR hand-off.
    return true
  }
}
