/* Calibrated real-time wall shader for AR.
 *
 * The old approach painted a flat colour ViroQuad at 0.6 opacity over the wall —
 * a colour film that washes out and ignores the room's real shading. This
 * replaces it with ONE material whose surface shaderModifier samples the LIVE
 * camera feed under each wall fragment and re-applies the exact luminance-
 * transfer recolour the web build uses (paint albedo × the wall's own shading,
 * with an anti-neon wash and finish-gated specular). Because it recolours the
 * real camera pixels in place, it moves freely with the phone and — with the
 * navigator's occlusionMode on — hides correctly behind furniture.
 *
 * Colour / finish / calibration are UNIFORMS (paintAlbedo, wallLum, specPreserve)
 * pushed via ViroMaterials.updateShaderUniform, so one material serves every
 * colour and can be upgraded to the render's ACHIEVED albedo after a photoreal
 * render (see calibration.ts server-side). The recolour math is kept in sync
 * with the web FRAG shader / recolorPixels (liveMath.ts) — DIFFUSE_CAP 1.5,
 * SPEC_WHITE 0.9, wash 0.55·(0.18+0.82·paintFactor).
 *
 * Grounded in the installed @reactvision/react-viro 2.57 API: `requiresCameraTexture`
 * auto-binds `sampler2D camera_texture` + `mat4 camera_image_transform` (OES on
 * Android), and screen UV comes from gl_FragCoord / the _rf_vpw,_rf_vph viewport
 * uniforms (the same mechanism ReactVision Studio uses — see
 * useStudioShaderViewportUniforms). NONE of the GLSL below is device-verified;
 * every DEVICE-QA note flags something to confirm on an EAS build.
 */

import { Dimensions, PixelRatio } from 'react-native';
import { ViroMaterials } from '@reactvision/react-viro';

import { PALETTE, getColor } from '@/lib/palette';
import { sheenForFinish, type Sheen } from '@/lib/materials';

/** Single material name — colour/finish live in uniforms, not the name. */
export const CALIBRATED_WALL_MATERIAL = 'wall-calibrated';

/** sRGB channel 0-255 → linear (pow-2.2), matching liveMath.srgbToLinear. */
function srgbToLinear(v: number): number {
  return Math.pow(v / 255, 2.2);
}

export function hexToLinearRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

/** sRGB 0-255 triple → linear (for the render's achieved-albedo override). */
export function rgb255ToLinear([r, g, b]: [number, number, number]): [number, number, number] {
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

/** How much white specular each sheen keeps (0 matte … gloss). Mirrors the
 *  web specPreserveForFinish scale, collapsed to the three AR sheens. */
const SHEEN_SPEC: Record<Sheen, number> = { matte: 0, satin: 0.35, gloss: 0.85 };

export function specPreserveForSheen(sheen: Sheen): number {
  return SHEEN_SPEC[sheen];
}

// GLSL uniform declarations the body references. camera_texture +
// camera_image_transform are auto-injected by Viro when requiresCameraTexture is
// set; _rf_vpw/_rf_vph are the physical-pixel viewport size (pushed on mount).
const UNIFORMS = `
uniform highp float _rf_vpw;
uniform highp float _rf_vph;
uniform lowp vec3 paintAlbedo;   // linear RGB
uniform lowp float wallLum;      // linear reference wall luminance
uniform lowp float specPreserve; // 0 matte .. 1 gloss
`;

// Surface-stage body: recolour the live camera pixel under this fragment.
// Keep in sync with liveMath.recolorPixels / the web FRAG shader.
const BODY = `
  // Screen UV from the fragment position and the physical viewport size, then
  // into camera-texture space via the engine-provided transform.
  highp vec2 screenUv = gl_FragCoord.xy / vec2(_rf_vpw, _rf_vph);
  highp vec2 camUv = (camera_image_transform * vec4(screenUv, 0.0, 1.0)).xy;
  lowp vec3 live = texture(camera_texture, camUv).rgb;

  lowp vec3 lin = pow(live, vec3(2.2));
  lowp float y = dot(lin, vec3(0.2126, 0.7152, 0.0722));
  lowp float denom = max(wallLum, 0.02);
  lowp float shading = min(y / denom, 2.5);
  lowp float diffuse = min(shading, 1.5);                 // DIFFUSE_CAP
  lowp float paintY = dot(paintAlbedo, vec3(0.2126, 0.7152, 0.0722));
  lowp float paintFactor = smoothstep(0.02, 0.18, paintY);
  lowp float washGain = 0.55 * (0.18 + 0.82 * paintFactor);
  lowp float wash = (shading - diffuse) * washGain;
  lowp float highlight = smoothstep(denom * 1.6, denom * 2.4, y) * specPreserve * 0.9; // SPEC_WHITE
  lowp vec3 recolLin = paintAlbedo * diffuse + vec3(wash + highlight);
  _surface.diffuse_color = vec4(pow(recolLin, vec3(1.0 / 2.2)), 1.0);
`;

const DEFAULT_ALBEDO = hexToLinearRgb(getColor('green-smoke')?.hex ?? '#7A8778');

/**
 * Registers the single calibrated wall material. Call once at module load
 * (alongside the existing ViroMaterials.createMaterials). lightingModel
 * 'Constant' = unlit: the surface colour we compute IS the output, no extra
 * shading. DEVICE-QA: confirm Constant honours a surface modifier's
 * _surface.diffuse_color and that the quad isn't rendered black.
 */
export function registerCalibratedWallMaterial(): void {
  ViroMaterials.createMaterials({
    [CALIBRATED_WALL_MATERIAL]: {
      lightingModel: 'Constant',
      // Registered so iOS updateShaderUniform() has targets (iOS only updates
      // uniforms declared here); values are pushed live below.
      materialUniforms: [
        { name: 'paintAlbedo', type: 'vec3', value: DEFAULT_ALBEDO },
        { name: 'wallLum', type: 'float', value: 0.3 },
        { name: 'specPreserve', type: 'float', value: 0 },
        { name: '_rf_vpw', type: 'float', value: 0 },
        { name: '_rf_vph', type: 'float', value: 0 },
      ],
      shaderModifiers: {
        surface: {
          requiresCameraTexture: true,
          uniforms: UNIFORMS,
          body: BODY,
        },
      },
    } as Parameters<typeof ViroMaterials.createMaterials>[0][string],
  });
}

/** Push physical-pixel viewport size so gl_FragCoord → screen UV is correct.
 *  Call on mount and on Dimensions 'change' (orientation). */
export function pushWallViewportUniforms(): void {
  const { width, height } = Dimensions.get('screen');
  const pr = PixelRatio.get();
  ViroMaterials.updateShaderUniform(CALIBRATED_WALL_MATERIAL, '_rf_vpw', 'float', width * pr);
  ViroMaterials.updateShaderUniform(CALIBRATED_WALL_MATERIAL, '_rf_vph', 'float', height * pr);
}

export interface WallLook {
  /** Linear-RGB paint albedo (from the swatch, or the render's achieved colour). */
  paintLinear: [number, number, number];
  /** Reference wall luminance (linear). Live estimate or calibration value. */
  wallLum: number;
  specPreserve: number;
}

/** Live-update the wall look (colour/finish/calibration) on all wall quads. */
export function updateWallLook({ paintLinear, wallLum, specPreserve }: WallLook): void {
  ViroMaterials.updateShaderUniform(CALIBRATED_WALL_MATERIAL, 'paintAlbedo', 'vec3', paintLinear);
  ViroMaterials.updateShaderUniform(CALIBRATED_WALL_MATERIAL, 'wallLum', 'float', wallLum);
  ViroMaterials.updateShaderUniform(
    CALIBRATED_WALL_MATERIAL,
    'specPreserve',
    'float',
    specPreserve,
  );
}

/** Resolve a colour id + finish to a WallLook (pre-render: swatch as albedo). */
export function lookFor(colorId: string, finish: string, wallLum = 0.3): WallLook {
  const hex = getColor(colorId)?.hex ?? PALETTE[0].hex;
  return {
    paintLinear: hexToLinearRgb(hex),
    wallLum,
    specPreserve: specPreserveForSheen(sheenForFinish(finish)),
  };
}
