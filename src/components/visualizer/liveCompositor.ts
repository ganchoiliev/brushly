// Display-rate compositor for the live AR wall preview.
//
// Two implementations behind one interface:
//
//  - WebGL2 (preferred): per-pixel work at display resolution every frame.
//    The coarse model mask (32×32 or 40×40) is upsampled edge-aware — a
//    joint-bilateral filter whose range term compares each screen pixel's
//    luminance against a low-LOD mip of the video at the mask cell, so the
//    paint edge snaps to real image edges instead of bleeding in a soft blob.
//    Colour is a luminance transfer in linear light (see liveMath.ts): the
//    paint supplies reflectance, the wall keeps its own shading — dark paints
//    actually read dark, texture and shadows survive, and glossier finishes
//    keep more of the specular highlights.
//
//  - 2D canvas (fallback): the original recipe — video draw + a small tint
//    canvas composited twice ('color' then 'soft-light'). Kept for the rare
//    WebGL2-less device and for A/B comparison on the debug page.
//
// A canvas is permanently bound to its first context type, so the factory
// decides once. GL context loss is absorbed (preventDefault + rebuild on
// restore); while lost, renders are skipped and the overlay simply shows
// nothing over the live video.

import { srgbToLinear, type LiveTuning, DEFAULT_TUNING } from '@/lib/visualizer/liveMath'

export interface CropRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

export interface CompositorParams {
  /** 0..1 overall opacity of the recolour. */
  tintStrength?: number
  /** Joint-bilateral range sigma in linear-luma units (WebGL only). */
  edgeSigma?: number
  /** 0 matte .. 1 gloss specular preservation (WebGL only). */
  specPreserve?: number
}

export interface LiveCompositor {
  readonly kind: 'webgl' | '2d'
  /** Draw one display frame; sizes the canvas to w×h device pixels. */
  render(video: HTMLVideoElement, crop: CropRect, w: number, h: number): void
  /** New smoothed wall alpha (0..1) from the model loop, at mask resolution. */
  updateMask(alpha: Float32Array, w: number, h: number): void
  /** Paint colour as sRGB 0-255 channels. */
  setColor(rgb: [number, number, number]): void
  /** Mask-weighted average linear luminance of the wall (WebGL only). */
  setWallLuminance(lum: number): void
  setParams(p: CompositorParams): void
  /** Clear the overlay to transparent (used on stop/fail). */
  clear(): void
  destroy(): void
}

/* ------------------------------ WebGL2 ------------------------------ */

const VERT = `#version 300 es
out vec2 vUv;
void main() {
  // Fullscreen triangle from gl_VertexID — no buffers needed.
  vec2 pos = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = pos;
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}`

// Keep the recolour math in sync with recolorPixels() in liveMath.ts.
const FRAG = `#version 300 es
precision highp float;
uniform sampler2D uVideo;
uniform sampler2D uMask;
uniform vec3 uPaint;      // linear RGB
uniform float uWallLum;   // linear
uniform float uTint;
uniform float uSpec;
uniform float uEdgeSigma;
uniform vec2 uMaskSize;   // texels
uniform vec2 uCropOff;    // crop origin in video uv
uniform vec2 uCropScale;  // crop extent in video uv
uniform float uGuideLod;  // video mip level matching the mask resolution
in vec2 vUv;
out vec4 outColor;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
// Keep in sync with liveMath.ts. DIFFUSE_CAP: how far the paint hue scales into
// a lit patch before the achromatic wash takes over (raised to hold colour on
// bright walls instead of washing them white). SPEC_WHITE: the only near-white
// source, gated by finish. BRIGHT_RELAX: bright-side widening of the mask
// edge-detector so lit wall next to a light keeps its paint (no old-colour rim).
// LOWERED 2.5→1.3: at 2.5 a moderately-bright OBJECT edge (a light desk/laptop,
// brighter than the wall) was rescued as "lit wall" and painted over — device-
// observed bleed of ~19% alpha onto object rims. At 1.3 that drops to the bilinear
// floor (~3%) so edges hug objects crisply, while a lit wall stays fully painted;
// the only cost is a hair less rescue on an extreme lamp-lit wall gradient. (The
// original edge-accurate feel the coarse-mask blend had, with the better colours.)
const float DIFFUSE_CAP = 1.5;
const float SPEC_WHITE = 0.9;
const float BRIGHT_RELAX = 1.3;

float lumaAt(vec2 screenUv, float lod) {
  vec3 srgb = textureLod(uVideo, uCropOff + screenUv * uCropScale, lod).rgb;
  return dot(pow(srgb, vec3(2.2)), LUMA);
}

void main() {
  // Screen uv with y-down, matching video/mask row order.
  vec2 suv = vec2(vUv.x, 1.0 - vUv.y);
  vec3 srgb = texture(uVideo, uCropOff + suv * uCropScale).rgb;
  vec3 lin = pow(srgb, vec3(2.2));
  float y = dot(lin, LUMA);

  // Joint-bilateral upsample of the coarse mask. Spatial term: gaussian on
  // the continuous distance to each mask texel (smooth as the pixel slides
  // between cells). Range term: similarity between this pixel's luma and the
  // video luma AT that mask cell (low-LOD mip) — a neighbour across an image
  // edge contributes almost nothing, so the paint boundary hugs the edge. The
  // range term is asymmetric (see below): a pixel brighter than the wall (lit by
  // a nearby lamp/window) is still treated as wall, so the paint reaches the
  // boundary instead of leaving a rim of the original colour.
  vec2 maskPos = suv * uMaskSize - 0.5;
  vec2 nearest = floor(maskPos + 0.5);
  float twoSigma2 = 2.0 * uEdgeSigma * uEdgeSigma;
  // Nearest cell's wall confidence. The bright-side range widening below is
  // scaled by it, so it only fires where we're already confidently on the wall
  // — a lamp/window/object cell has mCenter≈0 and stays un-widened (not rescued).
  float mCenter = texture(uMask, (clamp(nearest, vec2(0.0), uMaskSize - 1.0) + 0.5) / uMaskSize).r;
  float relax = 1.0 + (BRIGHT_RELAX - 1.0) * mCenter;
  float alpha = 0.0;
  float wsum = 0.0;
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 texel = clamp(nearest + vec2(float(dx), float(dy)), vec2(0.0), uMaskSize - 1.0);
      vec2 tuv = (texel + 0.5) / uMaskSize;
      float m = texture(uMask, tuv).r;
      vec2 d = texel - maskPos;
      float ws = exp(-dot(d, d) / 1.125); // spatial sigma 0.75 texels
      float gy = lumaAt(tuv, uGuideLod);
      float dyl = y - gy;
      // Asymmetric range term. A pixel BRIGHTER than its guide cell next to a
      // light is same-wall (a lit gradient), not an edge: widen the sigma so it
      // keeps mask weight and the paint reaches the boundary — no rim of old
      // wall around lamps/windows. A DARKER pixel may be a real occluder/shadow
      // edge, so keep the tight sigma — paint never bleeds onto furniture or the
      // fixture. (JBU is compositor-only; there is no CPU mirror of this.)
      float s2 = dyl > 0.0 ? twoSigma2 * (relax * relax) : twoSigma2;
      float wr = exp(-(dyl * dyl) / s2);
      float w = ws * (wr + 0.02); // floor keeps flat regions bilinear-smooth
      alpha += m * w;
      wsum += w;
    }
  }
  alpha = wsum > 1e-5 ? alpha / wsum : texture(uMask, suv).r;
  alpha = min(alpha * 1.06, 1.0); // confidence gain — keep in sync with liveMath.ALPHA_GAIN

  // Luminance-transfer recolour (see liveMath.recolorPixels). The paint colour
  // scales with the wall's shading up to DIFFUSE_CAP× the wall average; that cap
  // sets how far the HUE carries into a lit/overexposed patch before the excess
  // brightness spills into an achromatic wash (scaled by the paint's own
  // reflectance, so a dark colour absorbs the excess instead of leaving a pale
  // ghost, and the window tops out by ~0.18 so saturated mid-tones keep the full
  // anti-neon wash). The near-white specular is separate and finish-gated
  // (SPEC_WHITE), so a matte wall never grows a white blob on a bright patch.
  float denom = max(uWallLum, 0.02);
  float shading = min(y / denom, 2.5);
  float diffuse = min(shading, DIFFUSE_CAP);
  float paintY = dot(uPaint, LUMA);
  float paintFactor = smoothstep(0.02, 0.18, paintY);
  float washGain = 0.55 * (0.18 + 0.82 * paintFactor);
  float wash = (shading - diffuse) * washGain;
  // Achromatic specular, gated only by finish (matte uSpec=0 → none).
  float highlight = smoothstep(denom * 1.6, denom * 2.4, y) * uSpec * SPEC_WHITE;
  vec3 recol = uPaint * diffuse + vec3(wash + highlight);
  vec3 outLin = mix(lin, recol, clamp(alpha * uTint, 0.0, 1.0));
  outColor = vec4(pow(outLin, vec3(1.0 / 2.2)), 1.0);
}`

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function createWebglCompositor(canvas: HTMLCanvasElement): LiveCompositor | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true, // transparent clear on stop — an opaque canvas would flash black
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  })
  if (!gl) return null

  interface GlState {
    program: WebGLProgram
    videoTex: WebGLTexture
    maskTex: WebGLTexture
    loc: Record<string, WebGLUniformLocation | null>
  }

  let state: GlState | null = null
  let lost = false
  let maskW = 0
  let maskH = 0
  let maskBytes: Uint8Array | null = null
  // Pending CPU-side copies so a context restore can rebuild the mask.
  let paint: [number, number, number] = [0, 0, 0]
  let wallLum = 0.5
  let params: Required<CompositorParams> = {
    tintStrength: DEFAULT_TUNING.tintStrength,
    edgeSigma: DEFAULT_TUNING.edgeSigma,
    specPreserve: 0.15,
  }

  const UNIFORMS = [
    'uVideo',
    'uMask',
    'uPaint',
    'uWallLum',
    'uTint',
    'uSpec',
    'uEdgeSigma',
    'uMaskSize',
    'uCropOff',
    'uCropScale',
    'uGuideLod',
  ] as const

  const init = (): boolean => {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = gl.createProgram()
    if (!vs || !fs || !program) return false
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      return false
    }
    const videoTex = gl.createTexture()
    const maskTex = gl.createTexture()
    if (!videoTex || !maskTex) return false
    gl.bindTexture(gl.TEXTURE_2D, videoTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.bindTexture(gl.TEXTURE_2D, maskTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    // NEAREST: the shader wants raw cell values; smoothing is its own job.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    const loc: GlState['loc'] = {}
    for (const u of UNIFORMS) loc[u] = gl.getUniformLocation(program, u)
    state = { program, videoTex, maskTex, loc }
    // Re-upload the last mask after a context restore.
    if (maskBytes && maskW > 0) uploadMask()
    return true
  }

  const uploadMask = () => {
    if (!state || !maskBytes) return
    gl.bindTexture(gl.TEXTURE_2D, state.maskTex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, maskW, maskH, 0, gl.RED, gl.UNSIGNED_BYTE, maskBytes)
  }

  const onLost = (e: Event) => {
    e.preventDefault() // allow restoration
    lost = true
    state = null
  }
  const onRestored = () => {
    lost = !init()
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  if (!init()) {
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
    return null
  }

  return {
    kind: 'webgl',
    render(video, crop, w, h) {
      if (lost || !state || w <= 0 || h <= 0) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, w, h)
      gl.useProgram(state.program)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, state.videoTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, video)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, state.maskTex)

      const vw = video.videoWidth
      const vh = video.videoHeight
      const loc = state.loc
      gl.uniform1i(loc.uVideo, 0)
      gl.uniform1i(loc.uMask, 1)
      gl.uniform3f(loc.uPaint, srgbToLinear(paint[0]), srgbToLinear(paint[1]), srgbToLinear(paint[2]))
      gl.uniform1f(loc.uWallLum, wallLum)
      // No mask yet → draw the plain video (compositor start races the first pass).
      gl.uniform1f(loc.uTint, maskW > 0 ? params.tintStrength : 0)
      gl.uniform1f(loc.uSpec, params.specPreserve)
      gl.uniform1f(loc.uEdgeSigma, params.edgeSigma)
      gl.uniform2f(loc.uMaskSize, Math.max(maskW, 1), Math.max(maskH, 1))
      gl.uniform2f(loc.uCropOff, crop.sx / vw, crop.sy / vh)
      gl.uniform2f(loc.uCropScale, crop.sw / vw, crop.sh / vh)
      gl.uniform1f(loc.uGuideLod, maskH > 0 ? Math.max(0, Math.log2(crop.sh / maskH)) : 0)

      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    updateMask(alpha, w, h) {
      maskW = w
      maskH = h
      if (!maskBytes || maskBytes.length !== w * h) maskBytes = new Uint8Array(w * h)
      for (let i = 0; i < alpha.length; i++) maskBytes[i] = Math.round(alpha[i] * 255)
      if (!lost && state) uploadMask()
    },
    setColor(rgb) {
      paint = rgb
    },
    setWallLuminance(lum) {
      wallLum = lum
    },
    setParams(p) {
      params = { ...params, ...p }
    },
    clear() {
      if (lost || !state) return
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
    },
    destroy() {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
      if (state) {
        gl.deleteTexture(state.videoTex)
        gl.deleteTexture(state.maskTex)
        gl.deleteProgram(state.program)
        state = null
      }
      maskBytes = null
      // Do NOT loseContext() here: the canvas is permanently bound to webgl2,
      // and a context lost via the extension stays lost until restoreContext()
      // — a later session on the same canvas (camera busy → "Try again")
      // would find a dead context AND a canvas no 2D fallback can claim.
      // Explicitly deleted resources above are all the cleanup needed.
    },
  }
}

/* ----------------------------- 2D canvas ----------------------------- */

function create2dCompositor(canvas: HTMLCanvasElement): LiveCompositor | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Canvas blend support is near-universal, but degrade to a plain alpha
  // overlay rather than an invisible one if 'color'/'soft-light' are missing.
  ctx.globalCompositeOperation = 'color'
  const blendOk = ctx.globalCompositeOperation === 'color'
  ctx.globalCompositeOperation = 'source-over'

  const tint = document.createElement('canvas')
  let tintData: ImageData | null = null
  let alphaRef: Float32Array | null = null
  let maskW = 0
  let maskH = 0
  let color: [number, number, number] = [0, 0, 0]
  let tintStrength = DEFAULT_TUNING.tintStrength

  const repaintTint = () => {
    if (!alphaRef || maskW === 0) return
    if (tint.width !== maskW || tint.height !== maskH) {
      tint.width = maskW
      tint.height = maskH
      tintData = null
    }
    const tctx = tint.getContext('2d')
    if (!tctx) return
    if (!tintData) tintData = tctx.createImageData(maskW, maskH)
    const px = tintData.data
    const [r, g, b] = color
    for (let i = 0; i < alphaRef.length; i++) {
      const p = i * 4
      px[p] = r
      px[p + 1] = g
      px[p + 2] = b
      px[p + 3] = Math.round(alphaRef[i] * 255 * tintStrength)
    }
    tctx.putImageData(tintData, 0, 0)
  }

  return {
    kind: '2d',
    render(video, crop, w, h) {
      if (w <= 0 || h <= 0) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h)
      if (maskW === 0) return
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      if (blendOk) {
        // 'color' transfers the paint's hue/saturation at the wall's own
        // luminance; 'soft-light' pulls brightness toward the paint. Both
        // preserve texture and shadows.
        ctx.globalCompositeOperation = 'color'
        ctx.drawImage(tint, 0, 0, w, h)
        ctx.globalCompositeOperation = 'soft-light'
        ctx.drawImage(tint, 0, 0, w, h)
        ctx.globalCompositeOperation = 'source-over'
      } else {
        ctx.globalAlpha = 0.55
        ctx.drawImage(tint, 0, 0, w, h)
        ctx.globalAlpha = 1
      }
    },
    updateMask(alpha, w, h) {
      alphaRef = alpha
      maskW = w
      maskH = h
      repaintTint()
    },
    setColor(rgb) {
      color = rgb
      repaintTint()
    },
    setWallLuminance() {
      // luminance transfer is WebGL-only; the blend recipe approximates it
    },
    setParams(p) {
      if (p.tintStrength !== undefined && p.tintStrength !== tintStrength) {
        tintStrength = p.tintStrength
        repaintTint()
      }
    },
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    },
    destroy() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      alphaRef = null
      tintData = null
    },
  }
}

/* ------------------------------ factory ------------------------------ */

export type CompositorMode = 'auto' | 'webgl' | '2d'

// Whether this device can run our exact GL pipeline, proven on a scratch
// canvas (context + shader compile + link). Cached: drivers don't change
// mid-session. Probing BEFORE touching the real canvas matters because the
// first successful getContext() call fixes a canvas's context type for good —
// claiming the overlay as webgl2 and then failing shader compile would leave
// it unusable by the 2D fallback too.
let webglProbe: boolean | null = null

function probeWebgl(): boolean {
  if (webglProbe !== null) return webglProbe
  try {
    const scratch = document.createElement('canvas')
    const gl = scratch.getContext('webgl2')
    if (!gl) return (webglProbe = false)
    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    const program = vs && fs ? gl.createProgram() : null
    let ok = false
    if (vs && fs && program) {
      gl.attachShader(program, vs)
      gl.attachShader(program, fs)
      gl.linkProgram(program)
      ok = Boolean(gl.getProgramParameter(program, gl.LINK_STATUS))
      gl.deleteProgram(program)
    }
    if (vs) gl.deleteShader(vs)
    if (fs) gl.deleteShader(fs)
    gl.getExtension('WEBGL_lose_context')?.loseContext() // scratch only — frees the GPU context
    return (webglProbe = ok)
  } catch {
    return (webglProbe = false)
  }
}

/**
 * Creates the best available compositor for this canvas. 'auto' only claims
 * the canvas as webgl2 after the scratch-canvas probe proves the full
 * pipeline works, so the 2D fallback always remains reachable when it can't.
 */
export function createLiveCompositor(
  canvas: HTMLCanvasElement,
  mode: CompositorMode = 'auto',
): LiveCompositor | null {
  if (mode !== '2d' && probeWebgl()) {
    const gl = createWebglCompositor(canvas)
    if (gl) return gl
    if (mode === 'webgl') return null
    // Probe passed but this specific canvas failed (e.g. it was claimed as
    // webgl2 before and that context is dead). 2D below can only work if the
    // canvas is not webgl2-bound; create2dCompositor returns null otherwise.
  }
  if (mode === 'webgl') return null
  return create2dCompositor(canvas)
}

export type { LiveTuning }
