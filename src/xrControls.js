// XR gamepad controls for rotating and scaling a placed object
// - Right thumbstick X/Y: rotate around Y/X
// - A/X button: scale up
// - B/Y button: scale down

const ROTATION_SENSITIVITY = 1.5; // radians/sec at full deflection
const SCALE_STEP = 0.02; // per frame when button held
const MIN_SCALE = 0.05;
const MAX_SCALE = 10.0;

export function updateXRControls(session, placedObject, deltaSeconds = 0.016) {
  if (!session || !placedObject) return;

  const state = (placedObject.userData.controlState = placedObject.userData.controlState || {
    scale: placedObject.scale?.x || 1,
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
  }

  if (rotateX !== 0 || rotateY !== 0) {
    placedObject.rotation.x += rotateX;
    placedObject.rotation.y += rotateY;
  }

  if (scaleDelta !== 0) {
    state.scale = clamp(state.scale * (1 + scaleDelta), MIN_SCALE, MAX_SCALE);
    placedObject.scale.setScalar(state.scale);
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}


