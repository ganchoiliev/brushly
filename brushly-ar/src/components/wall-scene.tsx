import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import {
  ViroAmbientLight,
  ViroARPlane,
  ViroARScene,
  ViroDirectionalLight,
  ViroMaterials,
  ViroQuad,
  ViroTrackingStateConstants,
  type ViroAnchor,
  type ViroTrackingReason,
  type ViroTrackingState,
} from '@reactvision/react-viro';

import { getColor } from '@/lib/palette';
import { WALL_MATERIALS, wallMaterialName, type Sheen } from '@/lib/materials';
import {
  CALIBRATED_WALL_MATERIAL,
  hexToLinearRgb,
  pushWallViewportUniforms,
  registerCalibratedWallMaterial,
  rgb255ToLinear,
  type ShaderStage,
  specPreserveForSheen,
  updateWallLook,
} from '@/lib/wall-shader';

/* Register both wall materials once at module load:
   - the calibrated shader (single material; colour/finish/calibration live in
     uniforms) — the primary, camera-sampling luminance-transfer recolour;
   - the flat per-(colour,sheen) PBR materials — always registered, the on-device
     fallback the shader path degrades to. */

// ─── The device-QA switch ───────────────────────────────────────────────────────
// The calibrated camera-sampling shader crashed on the first device run (the
// hand-written camera_texture GLSL didn't compile — see wall-shader.ts header for
// the root cause + fix). It is now rebuilt in STAGES so it can be de-risked ONE
// unknown at a time on a real phone: set TARGET_SHADER_STAGE, reload Metro, look.
//   0 = OFF   → flat PBR quad (known-good; the SHIPPED default — never regress
//               real users to an untested shader).
//   1 = Constant surface modifier paints a fixed colour (no camera). Proves the
//       material registers and Constant honours _surface.diffuse_color.
//   2 = gl_FragCoord + viewport-uniform GRADIENT (no camera). Isolates the
//       screen-UV machinery from the camera binding.
//   3 = + live camera_texture sample, shown as a 50% green blend (the risky bind).
//   4 = full luminance-transfer recolour (paint × wall shading) — the real look.
// Advance only after the previous stage renders correctly on-device; drop back a
// stage the moment one misbehaves.
// DEVICE-QA FINDINGS (real Android device, 2026-07-04):
//   stage 1 (fixed colour)  → PASS: sage quad rendered, no crash, Constant honours it
//   stage 2 (UV gradient)   → PASS: gl_FragCoord + viewport uniforms work in-surface
//   stage 3 (camera_texture) → FAIL: renders NOTHING. The engine's Android OES
//     camera_texture bind via core createMaterials produces no output (machinery is
//     proven fine by stage 2, so the camera sampler is the isolated blocker).
// Held at 0 (safe flat quad). Even a working camera bind can't mask around objects
// (no wall mask on-device) — that edge quality lives in the web segmentation path.
const TARGET_SHADER_STAGE: ShaderStage = 0;

// Device/perf gate: the shader path is native GL only (web has its own painter).
// This is also the seam to add a remote kill-switch or a per-device allowlist
// without touching the render path. A NATIVE GLSL compile failure can't be caught
// from JS — that's exactly why the default is stage 0 and each stage is verified
// on-device before it ships, rather than trusting a runtime try/catch to save us.
function resolveShaderStage(target: ShaderStage): ShaderStage {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return 0;
  return target;
}
const SHADER_STAGE = resolveShaderStage(TARGET_SHADER_STAGE);

ViroMaterials.createMaterials(WALL_MATERIALS);

// Register the shader material ONLY when a stage is on: Viro compiles the
// shaderModifier at registration, so registering a broken stage crashes even if
// nothing renders it. A JS-level failure here (never a native compile error) falls
// back to the flat quad instead of taking AR down. Declared before use.
function initCalibratedShader(): boolean {
  if (SHADER_STAGE <= 0) return false;
  try {
    return registerCalibratedWallMaterial(SHADER_STAGE);
  } catch (err) {
    console.warn('[wall-shader] registration failed; falling back to flat quad', err);
    return false;
  }
}
const SHADER_ACTIVE = initCalibratedShader();

const WALL_OPACITY = 0.6; // flat-fallback opacity; the shader path uses 1.0

interface TrackedPlane {
  anchorId: string;
  width: number;
  height: number;
  center: [number, number, number];
}

export interface WallSceneProps {
  selectedColorId: string;
  sheen: Sheen;
  /* True while the shutter grabs a frame — the tint quads drop to opacity 0
     so the render API receives the unpainted wall. */
  overlayHidden: boolean;
  /* When set (returning to AR after a render), the shader paints this ACHIEVED
     albedo (sRGB 0-255) + reference luminance instead of the raw swatch, so the
     live wall matches the photoreal render. Cleared when a new look is picked. */
  paintOverride?: [number, number, number];
  wallLumOverride?: number;
  onWallCountChanged: (count: number) => void;
  onTrackingReady: (ready: boolean) => void;
}

/* The scene component receives our props via the navigator's viroAppProps. */
interface SceneNavigatorInjectedProps {
  arSceneNavigator?: { viroAppProps?: WallSceneProps };
  sceneNavigator?: { viroAppProps?: WallSceneProps };
}

// ARKit plane classifications that are vertical but NOT paintable wall.
const NON_WALL = new Set(['Window', 'Door']);

// A wall must clear ADMIT in BOTH width and height (metres) to START being
// tinted. AR plane detection throws up small, thin, low-confidence planes —
// ceiling strips, reflections, furniture edges — that render as floating coloured
// triangles (the "sticker overlay" look users hate). Requiring both extents drops
// the thin junk: a sliver always fails on its short side, while a real wall clears
// the bar in both dimensions almost immediately as the user pans across it.
const ADMIT_WALL_EXTENT_M = 0.5;
// Once tinted, a wall is only DROPPED when it falls below this lower bar on an
// axis. The hysteresis gap [KEEP, ADMIT] debounces the per-frame extent jitter
// ARKit/ARCore report: a borderline wall won't blink off (and re-flap the "point
// at a wall" hint) on a momentary dip, yet a plane that genuinely shrinks to a
// sliver — including junk that spiked over ADMIT for a single frame — is still
// evicted rather than lingering as a stale triangle. DEVICE-QA knobs: raise ADMIT
// to kill more junk; widen the gap if borderline walls flicker.
const KEEP_WALL_EXTENT_M = 0.35;

// Is this anchor a paintable wall at all, size aside? anchorDetectionTypes is
// PlanesVertical-only so every plane anchor should be a wall; the alignment check
// guards against config drift, and ARKit's ML classification (when present) skips
// windows/doors. Unclassified ('None'/undefined — common on ARCore) is kept. Kept
// separate from the size gate so the anchor handler can tell "not a wall" (drop
// it) from "a wall that's momentarily too small" (keep what we already have).
function isWallAnchor(anchor: ViroAnchor): boolean {
  if (anchor.type !== 'plane' || anchor.alignment?.startsWith('Horizontal')) {
    return false;
  }
  if (anchor.classification && NON_WALL.has(anchor.classification)) {
    return false;
  }
  return true;
}

// Metric extents (metres) of a plane. Prefer ARKit/ARCore's own width/height;
// fall back to the bounding box of the boundary polygon when the scalar extents
// aren't reported. `vertices` are in plane-local XZ — Viro's own ViroARPlane
// selector maps [x,_y,z]→[x,z] and lays it flat with the same [-90,0,0] rotation
// we use — so max-minus-min over X and Z IS the width/height. Returns NaN extents
// when there's no size signal at all, so the size gate treats the plane as "too
// small": we never tint an unmeasurable junk plane, and never fabricate a bogus
// area for ranking (which the old `?? 1` fallback did — a 1×1 sentinel could
// out-rank a real sub-1m² wall, or on an extentless platform make every plane
// tie at area 1 and pick an arbitrary one).
function measureExtent(anchor: ViroAnchor): { width: number; height: number } {
  if (typeof anchor.width === 'number' && typeof anchor.height === 'number') {
    return { width: anchor.width, height: anchor.height };
  }
  const verts = anchor.vertices;
  if (verts && verts.length > 0) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const v of verts) {
      if (v[0] < minX) minX = v[0];
      if (v[0] > maxX) maxX = v[0];
      if (v[2] < minZ) minZ = v[2];
      if (v[2] > maxZ) maxZ = v[2];
    }
    return { width: maxX - minX, height: maxZ - minZ };
  }
  return { width: NaN, height: NaN };
}

/* ─── Flat-quad coverage tuning (device-tunable) ────────────────────────────────
   The flat overlay only ever painted the ONE largest plane, sized to ARKit's
   detected extent — so on a blank wall it read as a rectangle over the middle
   "half wall", and never appeared on more than one wall. These two knobs widen
   that without reintroducing the floating-triangle junk (the ADMIT/KEEP size gate
   above is what actually filters junk; painting more planes is safe as long as
   that gate holds). Raise ADMIT_WALL_EXTENT_M if junk reappears; lower
   WALL_COVERAGE_SCALE if paint bleeds onto the ceiling/floor/adjacent walls. */
// Paint up to this many of the largest admitted walls, not just the single
// largest — so panning across a room tints each wall it settles on.
const MAX_PAINTED_WALLS = 6;
// Grow each quad past ARKit's detected extent to fill more of the real wall. A
// blank-wall plane is often ~half the wall; a modest overscan closes that gap.
// 1.0 = exactly the detected plane (old behaviour).
const WALL_COVERAGE_SCALE = 1.35;

/* The walls we tint: the largest admitted planes (up to MAX_PAINTED_WALLS).
   Largest-area first is a cheap, pose-free proxy for "the walls the user is
   aiming at", and because ARKit keeps off-screen walls tracked it stays
   responsive as a wall you pan onto grows. Returns [] when nothing qualifies yet,
   so the "point at a wall" hint stays up. */
function pickPaintedWalls(
  planes: Record<string, TrackedPlane>,
): TrackedPlane[] {
  return Object.values(planes)
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, MAX_PAINTED_WALLS);
}

/* Viro's initialScene.scene type is `() => JSX.Element`, but the navigator
   injects sceneNavigator props at runtime — hence the defaulted parameter. */
export default function WallScene(props: SceneNavigatorInjectedProps = {}) {
  const appProps =
    props.arSceneNavigator?.viroAppProps ?? props.sceneNavigator?.viroAppProps;
  const selectedColorId = appProps?.selectedColorId ?? 'green-smoke';
  const sheen = appProps?.sheen ?? 'matte';
  const overlayHidden = appProps?.overlayHidden ?? false;
  const paintOverride = appProps?.paintOverride;
  const wallLumOverride = appProps?.wallLumOverride;
  const onWallCountChanged = appProps?.onWallCountChanged;
  const onTrackingReady = appProps?.onTrackingReady;

  const [planes, setPlanes] = useState<Record<string, TrackedPlane>>({});

  // One handler for both found and updated — the single admission control for the
  // tinted-wall set. A newly-seen wall must clear ADMIT on both axes; an already-
  // tracked wall is refreshed to its current size and kept until it drops below
  // the lower KEEP bar (hysteresis against per-frame extent jitter) or is
  // reclassified away from being a wall. Refreshing the stored size every frame is
  // what stops a plane that spiked over ADMIT for one frame from lingering, tinted
  // at that stale inflated size. Routing `updated` through this too lets a wall
  // that only clears ADMIT AFTER the user pans in still get tinted.
  const syncAnchor = useCallback((anchor: ViroAnchor) => {
    setPlanes((prev) => {
      const existing = prev[anchor.anchorId];
      // No longer a paintable wall (reclassified horizontal/window/door, or not a
      // plane): drop it if we were tracking it.
      if (!isWallAnchor(anchor)) {
        if (!existing) return prev;
        const next = { ...prev };
        delete next[anchor.anchorId];
        return next;
      }
      const { width, height } = measureExtent(anchor);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        // No size signal this frame — unknown ≠ shrunk. Don't admit on nothing,
        // and don't tear down a wall we're already tracking. (Real ARKit/ARCore
        // keep reporting numeric extents for a tracked plane and fire
        // onAnchorRemoved for dead ones, so a tracked plane going permanently
        // signal-less isn't expected; if DEVICE-QA ever shows a triangle that
        // survives panning away, evict after N sustained no-signal frames here.)
        return prev;
      }
      const gate = existing ? KEEP_WALL_EXTENT_M : ADMIT_WALL_EXTENT_M;
      if (width < gate || height < gate) {
        if (!existing) return prev; // sub-ADMIT junk we've never tinted: stay out
        const next = { ...prev }; // a tracked wall that really shrank: evict it
        delete next[anchor.anchorId];
        return next;
      }
      return {
        ...prev,
        [anchor.anchorId]: {
          anchorId: anchor.anchorId,
          width,
          height,
          center: anchor.center ?? existing?.center ?? [0, 0, 0],
        },
      };
    });
  }, []);

  const handleAnchorRemoved = useCallback((anchor?: ViroAnchor) => {
    if (!anchor) return;
    setPlanes((prev) => {
      if (!prev[anchor.anchorId]) return prev;
      const next = { ...prev };
      delete next[anchor.anchorId];
      return next;
    });
  }, []);

  const handleTrackingUpdated = useCallback(
    (state: ViroTrackingState, _reason: ViroTrackingReason) => {
      onTrackingReady?.(state === ViroTrackingStateConstants.TRACKING_NORMAL);
    },
    [onTrackingReady],
  );

  const wallCount = Object.keys(planes).length;
  useEffect(() => {
    onWallCountChanged?.(wallCount);
  }, [wallCount, onWallCountChanged]);

  // Push the physical-pixel viewport size so the shader's gl_FragCoord → screen
  // UV → camera-texture sample is correct; refresh on orientation change. Only
  // stages that sample the camera (2+) read these uniforms.
  useEffect(() => {
    if (!SHADER_ACTIVE || SHADER_STAGE < 2) return;
    pushWallViewportUniforms();
    const sub = Dimensions.addEventListener('change', pushWallViewportUniforms);
    return () => sub.remove();
  }, []);

  // Live-update the wall look. Default albedo is the raw swatch; when the app
  // returns from a render with `paintOverride`, use the render's ACHIEVED albedo
  // (calibration.ts) so the live wall matches the photoreal result. Only the
  // recolour stage (4) reads these uniforms.
  useEffect(() => {
    if (!SHADER_ACTIVE || SHADER_STAGE < 4) return;
    const paintLinear = paintOverride
      ? rgb255ToLinear(paintOverride)
      : hexToLinearRgb(getColor(selectedColorId)?.hex ?? '#7A8778');
    updateWallLook({
      paintLinear,
      // DEVICE-QA: a live wall-luminance estimate would track exposure better
      // than either the calibration value or this constant.
      wallLum: wallLumOverride ?? 0.3,
      specPreserve: specPreserveForSheen(sheen),
    });
  }, [selectedColorId, sheen, paintOverride, wallLumOverride]);

  const material = SHADER_ACTIVE
    ? CALIBRATED_WALL_MATERIAL
    : wallMaterialName(selectedColorId, sheen);
  const shownOpacity = SHADER_ACTIVE ? 1 : WALL_OPACITY;

  // The walls we tint. [] → nothing qualifies yet, so the "point at a wall" hint
  // (driven by wallCount in the painter) stays up.
  const walls = pickPaintedWalls(planes);

  return (
    <ViroARScene
      anchorDetectionTypes={['PlanesVertical']}
      onAnchorFound={syncAnchor}
      onAnchorUpdated={syncAnchor}
      onAnchorRemoved={handleAnchorRemoved}
      onTrackingUpdated={handleTrackingUpdated}
    >
      {/* The ambient light is load-bearing: Viro only forwards the AR light
          estimate to JS, it never feeds the renderer, and the shader's ambient
          term comes solely from ViroAmbientLight nodes — without one every
          Lambert/Blinn/Phong quad renders near-black. The soft key light adds
          a little directional variance on top. */}
      <ViroAmbientLight color="#ffffff" intensity={1000} />
      <ViroDirectionalLight
        color="#ffffff"
        direction={[0.3, -1, -0.3]}
        intensity={200}
      />
      {walls.map((w) => (
        <ViroARPlane key={w.anchorId} anchorId={w.anchorId}>
          {/* Plane anchors have +Y normals in local space; -90° about X lays
              the quad onto the wall. Overscan (WALL_COVERAGE_SCALE) fills more of
              the real wall than ARKit's detected sub-extent. */}
          <ViroQuad
            position={w.center}
            rotation={[-90, 0, 0]}
            width={w.width * WALL_COVERAGE_SCALE}
            height={w.height * WALL_COVERAGE_SCALE}
            materials={[material]}
            opacity={overlayHidden ? 0 : shownOpacity}
          />
        </ViroARPlane>
      ))}
    </ViroARScene>
  );
}
