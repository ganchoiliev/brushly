# Build context is the REPO ROOT (the service imports ../../src/lib/visualizer):
#   docker build -f services/wall-calibration/Dockerfile -t wall-calibration .
#
# node_modules must live at /app so the shared modules under /app/src resolve
# onnxruntime-node + sharp (Node resolves node_modules upward from the importer).
FROM node:22-slim

WORKDIR /app

# Install the service deps at the image root.
COPY services/wall-calibration/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm install tsx@^4.19.2 --no-audit --no-fund

# Shared pipeline (segmentation.server, calibration, render-calibration, liveMath)
# and the server, mirroring the repo layout the relative import expects.
COPY src/lib/visualizer ./src/lib/visualizer
COPY services/wall-calibration/server.ts ./services/wall-calibration/server.ts

# The segmentation model (fp32; ~8 MB). WALL_MODEL_PATH points segmentation.server at it.
COPY public/models/wall-ade20k-fp32.onnx ./models/wall-ade20k-fp32.onnx

ENV NODE_ENV=production \
    PORT=8787 \
    WALL_MODEL_PATH=/app/models/wall-ade20k-fp32.onnx

EXPOSE 8787
CMD ["npx", "tsx", "services/wall-calibration/server.ts"]
