# WebXR AR Test (Quest 1/2)

Mixed reality AR placement with Three.js + WebXR, built for Oculus/Meta Quest 1 & 2 in Oculus Browser. Supports plane hit-test reticle, trigger-to-place, and hold-to-drag.

## Features
- Hit-test reticle to find planes (floors)
- Trigger once to place model; hold trigger to drag across plane
- Transparent background for passthrough MR
- Optional GLTF/GLB loading via `?model=/path/to/model.glb`
- HTTPS dev server for XR permissions

## Prerequisites
- Node.js 18+
- Quest 1 or 2 with Oculus Browser (latest)
- Same Wi‑Fi network between your dev machine and the Quest

## Install
```bash
npm install
```

## Run (HTTPS dev server)
```bash
npm run dev
```

By default this runs at `https://<your-computer-ip>:5173/` using a self‑signed cert.

### On the Quest
1. Find your computer’s LAN IP (e.g., 192.168.1.23).
2. Open Oculus Browser and navigate to `https://<your-ip>:5173/`.
3. Accept the HTTPS warning (self-signed certificate).
4. Allow camera permissions when prompted.
5. Tap “Enter AR”. Aim at the floor until the green ring appears. Press trigger to place; hold to drag.

### Load a custom model (optional)
Place your GLB/GLTF under `public/` or host it with CORS enabled. Append the query param:

```
https://<your-ip>:5173/?model=/myModel.glb
```

If loading fails, a fallback cube is used.

## Notes
- Works in Oculus Browser with immersive‑ar sessions. No polyfills needed.
- If you see no reticle, move the headset/controller to let the system find a plane.
- For best results, use good lighting and a textured floor.

## Build
```bash
npm run build && npm run preview
```
