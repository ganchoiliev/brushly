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

function asTrackedPlane(anchor: ViroAnchor): TrackedPlane | null {
  // anchorDetectionTypes is PlanesVertical-only, so every plane anchor here
  // is a wall; the alignment check guards against config drift, and ARKit's ML
  // classification (when present) lets us skip windows/doors. Unclassified
  // ('None'/undefined — common on ARCore) is kept.
  if (anchor.type !== 'plane' || anchor.alignment?.startsWith('Horizontal')) {
    return null;
  }
  if (anchor.classification && NON_WALL.has(anchor.classification)) {
    return null;
  }
  return {
    anchorId: anchor.anchorId,
    width: anchor.width ?? 1,
    height: anchor.height ?? 1,
    center: anchor.center ?? [0, 0, 0],
  };
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

  const handleAnchorFound = useCallback((anchor: ViroAnchor) => {
    const plane = asTrackedPlane(anchor);
    if (!plane) return;
    setPlanes((prev) => ({ ...prev, [plane.anchorId]: plane }));
  }, []);

  const handleAnchorUpdated = useCallback((anchor: ViroAnchor) => {
    const plane = asTrackedPlane(anchor);
    if (!plane) return;
    // ARKit/ARCore grow plane extents as the user scans — keep quads in sync.
    setPlanes((prev) =>
      prev[plane.anchorId] ? { ...prev, [plane.anchorId]: plane } : prev,
    );
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

  return (
    <ViroARScene
      anchorDetectionTypes={['PlanesVertical']}
      onAnchorFound={handleAnchorFound}
      onAnchorUpdated={handleAnchorUpdated}
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
      {Object.values(planes).map((plane) => (
        <ViroARPlane key={plane.anchorId} anchorId={plane.anchorId}>
          {/* Plane anchors have +Y normals in local space; -90° about X lays
              the quad onto the wall. */}
          <ViroQuad
            position={plane.center}
            rotation={[-90, 0, 0]}
            width={plane.width}
            height={plane.height}
            materials={[material]}
            opacity={overlayHidden ? 0 : shownOpacity}
          />
        </ViroARPlane>
      ))}
    </ViroARScene>
  );
}
