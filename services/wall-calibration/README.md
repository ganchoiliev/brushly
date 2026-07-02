# wall-calibration service

Runs the wall segmentation + render calibration for the native AR **calibrated
real-time shader**. It lives outside the Next app because `onnxruntime-node`
ships ~258 MB of native binaries — well over Vercel's serverless function limit.
It reuses the app's own pipeline verbatim (`../../src/lib/visualizer/*`), so
there is no logic to keep in sync; only the HTTP transport is here.

## API

`POST /calibrate`

```jsonc
// request
{ "beforeUrl": "https://…/source.jpg", "afterUrl": "https://…/render.png", "service": "interior" }
// response (200)
{ "calibration": { "paint": [176, 106, 80], "wallLum": 0.27, "coverage": 0.19 } }
// response (200) when the wall mask covers too little — caller uses the swatch colour
{ "calibration": null }
```

Send `x-calibration-secret: <CALIBRATION_SECRET>` when the env var is set.
`GET /health` → `{ "ok": true }`.

## Env

| var | purpose | default |
|-----|---------|---------|
| `PORT` | listen port | `8787` |
| `CALIBRATION_SECRET` | if set, required in `x-calibration-secret` | unset (open) |
| `WALL_MODEL_PATH` | ONNX model path | `<cwd>/public/models/wall-ade20k-fp32.onnx` |

## Run locally

```bash
# from the repo root (uses the root node_modules)
npx tsx services/wall-calibration/server.ts
curl -s localhost:8787/health
```

## Deploy (container)

```bash
# build context is the REPO ROOT
docker build -f services/wall-calibration/Dockerfile -t wall-calibration .
docker run -p 8787:8787 -e CALIBRATION_SECRET=… wall-calibration
```

Any container host works (Fly.io, Railway, Render, Cloud Run, a small VM). Size
it for one CPU pass per render (~100 ms warm) plus the ~8 MB model in memory.

## Wiring the render route (the remaining gate)

In `src/app/api/visualizer/render/route.ts`, after the render produces `after`,
call the service and include the result in the response — do **not** import the
pipeline directly (that pulls onnxruntime-node into the Vercel bundle):

```ts
// after producing beforeUrl + afterUrl
let calibration = null
if (process.env.CALIBRATION_SERVICE_URL) {
  try {
    const r = await fetch(`${process.env.CALIBRATION_SERVICE_URL}/calibrate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-calibration-secret': process.env.CALIBRATION_SECRET ?? '' },
      body: JSON.stringify({ beforeUrl, afterUrl, service }),
      signal: AbortSignal.timeout(8000),
    })
    if (r.ok) calibration = (await r.json()).calibration
  } catch {
    /* best-effort: no calibration → the app falls back to the swatch colour */
  }
}
return NextResponse.json({ renderId, beforeUrl, afterUrl, calibration })
```

Until `CALIBRATION_SERVICE_URL` is set, the render response simply omits
`calibration`, and the native app hides the "See it live on your wall" button —
nothing breaks.
