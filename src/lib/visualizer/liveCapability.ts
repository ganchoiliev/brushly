// Click-time gate for the live AR camera. The live path is a phone feature:
// on a desktop the 'environment' getUserMedia constraint silently falls back
// to the user-facing webcam, which points at a face, not a wall.
//
// Deliberately optimistic, and deliberately blind to enumerateDevices: before
// camera permission is granted, device labels/facing data are hidden and some
// browsers return an empty or collapsed device list, so any "has a rear
// camera?" heuristic fails closed on exactly the phones the feature exists
// for (real-device QA: the QR hand-off modal shown on the handset itself).
// This gate only answers "should this device ATTEMPT the live path?" from
// synchronous input signals — never the user agent string. The real
// capability test is getUserMedia inside ARCamera; a hard failure there
// (no camera / permission denied) falls back to the QR hand-off.
export function shouldAttemptLive(): boolean {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false
  // Primary input is touch: phones and tablets. Touchscreen laptops keep a
  // fine primary pointer (touchpad/mouse), so they fail here — their webcam
  // faces the user too.
  return navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches
}
