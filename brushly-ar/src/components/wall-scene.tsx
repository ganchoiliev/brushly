import { useCallback, useEffect, useState } from 'react';
import { Dimensions } from 'react-native';
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
  specPreserveForSheen,
  updateWallLook,
} from '@/lib/wall-shader';

/* Register both wall materials once at module load:
   - the calibrated shader (single material; colour/finish/calibration live in
     uniforms) — the primary, camera-sampling luminance-transfer recolour;
   - the flat per-(colour,sheen) PBR materials — kept as an on-device fallback.
   DEVICE-QA: if the shader quad renders black/blank on an EAS build, flip
   USE_CALIBRATED_SHADER to false to A/B against the known-good flat quad. */

// TEMPORARILY false: the calibrated camera-sampling shader crashed on first
// device test (custom GLSL / camera_texture binding is unverified on-device).
// Ship the known-good flat quad first to confirm the base AR + capture + render
// work on a real device, then re-enable and debug the shader on that foundation.
const USE_CALIBRATED_SHADER = false;

ViroMaterials.createMaterials(WALL_MATERIALS);
// Only register the camera-sampling shader material when it's actually in use:
// Viro may compile the shaderModifier at registration, so registering it while
// disabled could crash the exact same way. Declared before this so the guard works.
if (USE_CALIBRATED_SHADER) registerCalibratedWallMaterial();

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

/* Tint only ONE wall at a time — the largest tracked vertical plane, a cheap and
   robust proxy for "the wall the user is aiming at" (people point at the wall
   they want). This replaces tinting every detected plane, which is what produced
   the floating triangles. Largest-area (not nearest-screen-centre) is deliberate:
   it needs no per-frame camera pose, and because ARKit keeps off-screen walls
   tracked, plain "largest" stays responsive as the wall you pan onto grows to
   overtake the old one — a sticky/hysteresis pick would lag behind your aim. The
   cost is a possible tint hop between two near-equal walls in a corner (rare,
   self-correcting); revisit with camera-ray picking if device QA shows it. */
function pickAimedWall(
  planes: Record<string, TrackedPlane>,
): TrackedPlane | null {
  let best: TrackedPlane | null = null;
  let bestArea = 0;
  for (const plane of Object.values(planes)) {
    const area = plane.width * plane.height;
    if (area > bestArea) {
      bestArea = area;
      best = plane;
    }
  }
  return best;
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
  // UV → camera-texture sample is correct; refresh on orientation change.
  useEffect(() => {
    if (!USE_CALIBRATED_SHADER) return;
    pushWallViewportUniforms();
    const sub = Dimensions.addEventListener('change', pushWallViewportUniforms);
    return () => sub.remove();
  }, []);

  // Live-update the wall look. Default albedo is the raw swatch; when the app
  // returns from a render with `paintOverride`, use the render's ACHIEVED albedo
  // (calibration.ts) so the live wall matches the photoreal result.
  useEffect(() => {
    if (!USE_CALIBRATED_SHADER) return;
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

  const material = USE_CALIBRATED_SHADER
    ? CALIBRATED_WALL_MATERIAL
    : wallMaterialName(selectedColorId, sheen);
  const shownOpacity = USE_CALIBRATED_SHADER ? 1 : WALL_OPACITY;

  // The single wall we actually tint. null → nothing qualifies yet, so the
  // "point at a wall" hint (driven by wallCount in the painter) stays up.
  const wall = pickAimedWall(planes);

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
      {wall && (
        <ViroARPlane key={wall.anchorId} anchorId={wall.anchorId}>
          {/* Plane anchors have +Y normals in local space; -90° about X lays
              the quad onto the wall. */}
          <ViroQuad
            position={wall.center}
            rotation={[-90, 0, 0]}
            width={wall.width}
            height={wall.height}
            materials={[material]}
            opacity={overlayHidden ? 0 : shownOpacity}
          />
        </ViroARPlane>
      )}
    </ViroARScene>
  );
}
