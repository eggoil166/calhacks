// XR gamepad controls for placing, rotating, scaling, and clipping a placed object
// - Right thumbstick X/Y: rotate around Y/X
// - A/X button: scale up; B/Y button: scale down
// - Menu (2): toggle placement lock (when unlocked, placement code should move it)
// - Grip (1): toggle clipping plane on/off
// - Left thumbstick Y: move clipping plane height; X: rotate clipping plane yaw
// - Stick press (3): reset rotation/scale/clipping

const ROTATION_SENSITIVITY = 1.5; // radians/sec at full deflection
const SCALE_STEP = 0.02; // per frame when button held
const MIN_SCALE = 0.05;
const MAX_SCALE = 10.0;
const CLIP_HEIGHT_STEP = 0.01; // meters per frame when left stick Y held
const CLIP_TURN_STEP = 1.2; // radians/sec when left stick X held

export function updateXRControls(session, placedObject, deltaSeconds = 0.016) {
  if (!session || !placedObject) return;

  const state = (placedObject.userData.controlState = placedObject.userData.controlState || {
    scale: placedObject.scale?.x || 1,
    placementLocked: true,
    clipEnabled: false,
    clipHeight: 0,
    clipYaw: 0,
    _prevButtons: new Array(8).fill(false),
  });

  let rotateX = 0;
  let rotateY = 0;
  let scaleDelta = 0;

  for (const source of session.inputSources) {
    const gp = source && source.gamepad;
    if (!gp) continue;

    const axes = gp.axes || [];
    const buttons = gp.buttons || [];

    // Right stick: axes[0] (X), axes[1] (Y) per Quest mapping
    const rightX = axes[0] || 0;
    const rightY = axes[1] || 0;
    rotateY += rightX * ROTATION_SENSITIVITY * deltaSeconds; // yaw
    rotateX += -rightY * ROTATION_SENSITIVITY * deltaSeconds; // pitch

    // Buttons: A/B or X/Y can appear at indices 4/5 (or 0/1 on some mappings)
    const btnA = (buttons[4] && buttons[4].pressed) || (buttons[0] && buttons[0].pressed);
    const btnB = (buttons[5] && buttons[5].pressed) || (buttons[1] && buttons[1].pressed);
    if (btnA) scaleDelta += SCALE_STEP;
    if (btnB) scaleDelta -= SCALE_STEP;

    // Left stick: axes[2] (X), axes[3] (Y)
    const leftX = axes[2] || 0;
    const leftY = axes[3] || 0;
    state.clipHeight += -leftY * CLIP_HEIGHT_STEP;
    state.clipYaw += leftX * CLIP_TURN_STEP * deltaSeconds;

    // Edge detection for toggles
    const curr = [0, 1, 2, 3, 4, 5].map(i => !!(buttons[i] && buttons[i].pressed));
    const prev = state._prevButtons;
    const justPressed = (i) => curr[i] && !prev[i];
    if (justPressed(2)) state.placementLocked = !state.placementLocked; // menu toggles
    if (justPressed(1)) state.clipEnabled = !state.clipEnabled; // grip toggles clipping
    if (justPressed(3)) { // stick press resets
      state.scale = 1;
      placedObject.scale.setScalar(1);
      placedObject.rotation.set(0, 0, 0);
      state.clipHeight = 0;
      state.clipYaw = 0;
    }
    state._prevButtons = curr;
  }

  if (rotateX !== 0 || rotateY !== 0) {
    placedObject.rotation.x += rotateX;
    placedObject.rotation.y += rotateY;
  }

  if (scaleDelta !== 0) {
    state.scale = clamp(state.scale * (1 + scaleDelta), MIN_SCALE, MAX_SCALE);
    placedObject.scale.setScalar(state.scale);
  }

  // Apply clipping plane if enabled
  if (state.clipEnabled) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), state.clipHeight);
    plane.applyMatrix4(new THREE.Matrix4().makeRotationY(state.clipYaw));
    // enable local clipping
    const renderer = placedObject.parent && placedObject.parent.parent && placedObject.parent.parent.renderer;
    // Fallback: traverse materials and set clipping
    placedObject.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          m.clippingPlanes = [plane];
          m.clipShadows = false;
        });
      }
    });
  } else {
    placedObject.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          m.clippingPlanes = null;
        });
      }
    });
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}


