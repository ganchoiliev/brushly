import { useCallback, useEffect, useState } from 'react';
import {
  ViroARPlane,
  ViroARScene,
  ViroMaterials,
  ViroQuad,
  ViroTrackingStateConstants,
  type ViroAnchor,
  type ViroTrackingReason,
  type ViroTrackingState,
} from '@reactvision/react-viro';

import { SWATCHES, wallMaterialName } from '@/constants/swatches';

/* One translucent material per swatch. Lambert shading lets ARKit/ARCore's
   estimated scene light shade the tint, which reads far more like paint
   than a flat unlit overlay. Registered once at module load. */
ViroMaterials.createMaterials(
  Object.fromEntries(
    SWATCHES.map((s) => [
      wallMaterialName(s.id),
      { diffuseColor: s.hex, lightingModel: 'Lambert' as const },
    ]),
  ),
);

const WALL_OPACITY = 0.6;

interface TrackedPlane {
  anchorId: string;
  width: number;
  height: number;
  center: [number, number, number];
}

export interface WallSceneProps {
  selectedColorId: string;
  onWallCountChanged: (count: number) => void;
  onTrackingReady: (ready: boolean) => void;
}

/* The scene component receives our props via the navigator's viroAppProps. */
interface SceneNavigatorInjectedProps {
  arSceneNavigator?: { viroAppProps?: WallSceneProps };
  sceneNavigator?: { viroAppProps?: WallSceneProps };
}

function asTrackedPlane(anchor: ViroAnchor): TrackedPlane | null {
  // anchorDetectionTypes is PlanesVertical-only, so every plane anchor here
  // is a wall; the alignment check guards against config drift.
  if (anchor.type !== 'plane' || anchor.alignment?.startsWith('Horizontal')) {
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
  const selectedColorId = appProps?.selectedColorId ?? SWATCHES[0].id;
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

  const material = wallMaterialName(selectedColorId);

  return (
    <ViroARScene
      anchorDetectionTypes={['PlanesVertical']}
      onAnchorFound={handleAnchorFound}
      onAnchorUpdated={handleAnchorUpdated}
      onAnchorRemoved={handleAnchorRemoved}
      onTrackingUpdated={handleTrackingUpdated}
    >
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
            opacity={WALL_OPACITY}
          />
        </ViroARPlane>
      ))}
    </ViroARScene>
  );
}
