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
 * ─── Why this is built in STAGES (see registerCalibratedWallMaterial) ───────────
 * The first device run CRASHED on wall-focus: the hand-written camera_texture
 * shaderModifier failed to compile. Root cause, now confirmed against the
 * installed package: ReactVision STUDIO builds materials through
 * `buildViroMaterialDefinition` (Studio/domain/materialConfig.ts), whose
 * `injectMissingGlslDeclarations` PREPENDS
 *     uniform sampler2D camera_texture;
 *     uniform highp mat4 camera_image_transform;
 * to any shader that samples `camera_texture`. The CORE `ViroMaterials.createMaterials`
 * we call does NOT run that transform (ViroMaterials.ts just forwards to native) —
 * `requiresCameraTexture:true` makes native BIND the camera feed, but the GLSL must
 * still DECLARE the sampler itself or it won't compile. The previous version
 * referenced `camera_texture`/`camera_image_transform` in the BODY and never
 * declared them → compile failure → crash. DECL_CAMERA below adds exactly what
 * Studio injects.
 *
 * Because several other things are ALSO unverified on-device (does Constant honour
 * a surface modifier's `_surface.diffuse_color`? is the camera feed sRGB? is the
 * UV mapping right? does Android's OES `samplerExternalOES` substitution work with
 * `texture()`?), the material is assembled from STAGE fragments so the device-QA
 * loop can isolate ONE unknown at a time by bumping a single constant and reloading
 * Metro — instead of flipping one boolean and getting an unbisectable black screen:
 *   stage 1 — Constant + surface modifier writes a fixed colour (no camera).
 *   stage 2 — add the live camera_texture sample, shown as raw passthrough.
 *   stage 3 — the full luminance-transfer recolour (paint × wall shading).
 * wall-scene.tsx owns the stage constant + the flat-quad fallback gate.
 *
 * Colour / finish / calibration are UNIFORMS (paintAlbedo, wallLum, specPreserve)
 * pushed via ViroMaterials.updateShaderUniform, so one material serves every
 * colour and can be upgraded to the render's ACHIEVED albedo after a photoreal
 * render (see calibration.ts server-side). The recolour math is kept in sync
 * with the web FRAG shader / recolorPixels (liveMath.ts) — DIFFUSE_CAP 1.5,
 * SPEC_WHITE 0.9, wash 0.55·(0.18+0.82·paintFactor).
 *
 * Grounded in the installed @reactvision/react-viro 2.57 API: screen UV comes from
 * gl_FragCoord / the _rf_vpw,_rf_vph viewport uniforms (the same mechanism
 * ReactVision Studio uses — see useStudioShaderViewportUniforms). NONE of the GLSL
 * below is device-verified; every DEVICE-QA note flags something to confirm on an
 * EAS build.
 */

import { Dimensions, PixelRatio } from 'react-native';
import { ViroMaterials } from '@reactvision/react-viro';

import { PALETTE, getColor } from '@/lib/palette';
import { sheenForFinish, type Sheen } from '@/lib/materials';

/** Single material name — colour/finish live in uniforms, not the name. */
export const CALIBRATED_WALL_MATERIAL = 'wall-calibrated';

/**
 * How much of the camera-sampling shader is switched on. Advance ONE step at a
 * time on a real device (see the module header). 0 means "don't register the
 * material at all" — wall-scene.tsx uses the flat-quad fallback instead.
 */
export type ShaderStage = 0 | 1 | 2 | 3;

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

// ─── GLSL fragments, composed per stage ─────────────────────────────────────────

// EXACTLY what Studio's injectMissingGlslDeclarations prepends when a shader
// samples camera_texture. `requiresCameraTexture:true` makes native BIND the feed
// (and on Android substitute samplerExternalOES + the OES extension), but the
// declaration must be present in the GLSL source for the shader to compile — the
// core createMaterials path does not add it. Keep the exact spelling/precision.
const DECL_CAMERA = `uniform sampler2D camera_texture;
uniform highp mat4 camera_image_transform;`;

// Physical-pixel viewport size, pushed from JS (pushWallViewportUniforms) — the
// same names Studio's useStudioShaderViewportUniforms drives.
const DECL_VIEWPORT = `uniform highp float _rf_vpw;
uniform highp float _rf_vph;`;

// Look uniforms — colour/finish/calibration, pushed via updateWallLook.
const DECL_LOOK = `uniform mediump vec3 paintAlbedo;
uniform highp float wallLum;
uniform highp float specPreserve;`;

// Screen UV from the fragment position + physical viewport size, then into
// camera-texture space via the engine-provided transform, then sample the live
// pixel under this fragment. Declares `live` for the caller.
// DEVICE-QA: is (camera_image_transform * vec4(screenUv,0,1)).xy the right UV? Is
// the sample sRGB (the stage-3 pow-2.2 assumes so)? Is gl_FragCoord in physical
// pixels with a bottom-left origin here?
const SAMPLE_CAMERA = `
  highp vec2 screenUv = gl_FragCoord.xy / vec2(_rf_vpw, _rf_vph);
  highp vec2 camUv = (camera_image_transform * vec4(screenUv, 0.0, 1.0)).xy;
  mediump vec3 live = texture(camera_texture, camUv).rgb;`;

// Stage 1 — no camera at all. Prove createMaterials + a surface shaderModifier
// register without crashing and that lightingModel 'Constant' honours
// _surface.diffuse_color (green-smoke, so a black quad is obviously wrong, not a
// dark-but-plausible paint). Intentionally references NO uniforms.
const BODY_STAGE1 = `
  _surface.diffuse_color = vec4(0.478, 0.529, 0.471, 1.0);`;

// Stage 2 — the risky binding, shown raw. If the wall shows the live camera
// (roughly aligned), the sampler bind + UV are good; a frozen/black/offset image
// tells you which of those failed before any recolour math muddies it.
const BODY_STAGE2 = `${SAMPLE_CAMERA}
  _surface.diffuse_color = vec4(live, 1.0);`;

// Stage 3 — the production recolour. Kept in sync with liveMath.recolorPixels /
// the web FRAG shader. highp throughout the scalar math: `shading` is capped at
// 2.5 and would saturate at ~2.0 in a lowp register.
const BODY_STAGE3 = `${SAMPLE_CAMERA}
  highp vec3 lin = pow(live, vec3(2.2));
  highp float y = dot(lin, vec3(0.2126, 0.7152, 0.0722));
  highp float denom = max(wallLum, 0.02);
  highp float shading = min(y / denom, 2.5);
  highp float diffuse = min(shading, 1.5);                 // DIFFUSE_CAP
  highp float paintY = dot(paintAlbedo, vec3(0.2126, 0.7152, 0.0722));
  highp float paintFactor = smoothstep(0.02, 0.18, paintY);
  highp float washGain = 0.55 * (0.18 + 0.82 * paintFactor);
  highp float wash = (shading - diffuse) * washGain;
  highp float highlight = smoothstep(denom * 1.6, denom * 2.4, y) * specPreserve * 0.9; // SPEC_WHITE
  highp vec3 recolLin = paintAlbedo * diffuse + vec3(wash + highlight);
  _surface.diffuse_color = vec4(pow(recolLin, vec3(1.0 / 2.2)), 1.0);`;

const DEFAULT_ALBEDO = hexToLinearRgb(getColor('green-smoke')?.hex ?? '#7A8778');

type MaterialUniform = { name: string; type: string; value: unknown };

/** Physical-pixel viewport size — the value gl_FragCoord is normalised against. */
function currentViewport(): { vpw: number; vph: number } {
  const { width, height } = Dimensions.get('screen');
  const pr = PixelRatio.get();
  return { vpw: width * pr, vph: height * pr };
}

/** GLSL uniform declarations for a stage (only what that stage's body reads). */
function uniformsForStage(stage: ShaderStage): string {
  if (stage >= 3) return `${DECL_CAMERA}\n${DECL_VIEWPORT}\n${DECL_LOOK}`;
  if (stage === 2) return `${DECL_CAMERA}\n${DECL_VIEWPORT}`;
  return ''; // stage 1 reads no uniforms
}

function bodyForStage(stage: ShaderStage): string {
  if (stage >= 3) return BODY_STAGE3;
  if (stage === 2) return BODY_STAGE2;
  return BODY_STAGE1;
}

/** Uniforms iOS must know about so updateShaderUniform can reach them (iOS only
 *  applies updates to uniforms registered here — see materialConfig.ts). Only the
 *  ones a given stage actually drives from JS. */
function materialUniformsForStage(stage: ShaderStage): MaterialUniform[] | undefined {
  if (stage < 2) return undefined;
  // Seed the REAL viewport at registration (not 0) so a wall quad drawn before the
  // mount effect first pushes dims never divides gl_FragCoord by zero.
  const { vpw, vph } = currentViewport();
  const list: MaterialUniform[] = [
    { name: '_rf_vpw', type: 'float', value: vpw },
    { name: '_rf_vph', type: 'float', value: vph },
  ];
  if (stage >= 3) {
    list.push(
      { name: 'paintAlbedo', type: 'vec3', value: DEFAULT_ALBEDO },
      { name: 'wallLum', type: 'float', value: 0.3 },
      { name: 'specPreserve', type: 'float', value: 0 },
    );
  }
  return list;
}

/**
 * Registers the single calibrated wall material for the given stage. Call once at
 * module load from wall-scene.tsx, ONLY when stage > 0 (Viro compiles the
 * shaderModifier at registration, so registering a broken stage crashes even if
 * nothing renders it — the caller must gate on the stage). lightingModel
 * 'Constant' = unlit: the surface colour we compute IS the output, no extra
 * shading. Returns false without touching Viro when stage <= 0.
 * DEVICE-QA: confirm Constant honours a surface modifier's _surface.diffuse_color
 * (stage 1) and that the quad isn't rendered black.
 */
export function registerCalibratedWallMaterial(stage: ShaderStage): boolean {
  if (stage <= 0) return false;
  const uniforms = uniformsForStage(stage);
  const surface: Record<string, unknown> = { body: bodyForStage(stage) };
  if (uniforms) surface.uniforms = uniforms;
  if (stage >= 2) surface.requiresCameraTexture = true; // native binds the feed

  const material: Record<string, unknown> = {
    lightingModel: 'Constant',
    shaderModifiers: { surface },
  };
  const materialUniforms = materialUniformsForStage(stage);
  if (materialUniforms) material.materialUniforms = materialUniforms;

  ViroMaterials.createMaterials({
    [CALIBRATED_WALL_MATERIAL]: material as Parameters<
      typeof ViroMaterials.createMaterials
    >[0][string],
  });
  return true;
}

/** Push physical-pixel viewport size so gl_FragCoord → screen UV is correct.
 *  Call on mount and on Dimensions 'change' (orientation). No-op for stages that
 *  don't sample the camera. */
export function pushWallViewportUniforms(): void {
  const { vpw, vph } = currentViewport();
  ViroMaterials.updateShaderUniform(CALIBRATED_WALL_MATERIAL, '_rf_vpw', 'float', vpw);
  ViroMaterials.updateShaderUniform(CALIBRATED_WALL_MATERIAL, '_rf_vph', 'float', vph);
}

export interface WallLook {
  /** Linear-RGB paint albedo (from the swatch, or the render's achieved colour). */
  paintLinear: [number, number, number];
  /** Reference wall luminance (linear). Live estimate or calibration value. */
  wallLum: number;
  specPreserve: number;
}

/** Live-update the wall look (colour/finish/calibration) on all wall quads. Only
 *  meaningful at stage 3 (the recolour reads these uniforms). */
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
