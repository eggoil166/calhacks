import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

const appRoot = document.getElementById('app');
const buttonsRoot = document.getElementById('buttons');
const statusEl = document.getElementById('status');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
appRoot.appendChild(renderer.domElement);

// Lighting to make the model readable in AR
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0.5, 1, 0.25);
scene.add(directionalLight);

// Helpers for VR fallback
const gridHelper = new THREE.GridHelper(10, 40, 0x444444, 0x222222);
gridHelper.position.y = 0;
gridHelper.visible = false;
scene.add(gridHelper);
const raycaster = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0

// Reticle for hit-test results
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x4af2a1, transparent: true, opacity: 0.9 })
);
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

// Controller input (Quest trigger)
const controller = renderer.xr.getController(0);
scene.add(controller);
const controllerGrip = renderer.xr.getControllerGrip(0);
const controllerModelFactory = new XRControllerModelFactory();
controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
scene.add(controllerGrip);

let isDragging = false;
let placedObject = null;
let hitTestSource = null;
let localReferenceSpace = null;
let viewerSpace = null;
let useAR = false;
let useVR = false;

const params = new URLSearchParams(location.search);
const gltfUrl = params.get('model');
const defaultGlb = 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb';

async function loadModel(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const root = gltf.scene;
      // Scale model to a reasonable size (~25cm max dimension)
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const target = 0.25;
      const scale = target / maxDim;
      root.scale.setScalar(scale);
      root.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      resolve(root);
    }, undefined, reject);
  });
}

function createFallbackObject() {
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6, metalness: 0.1 });
  const mesh = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

function setPlacedObjectPoseFromReticle() {
  if (!placedObject || !reticle.visible) return;
  placedObject.position.setFromMatrixPosition(reticle.matrix);
  const targetQuat = new THREE.Quaternion().setFromRotationMatrix(reticle.matrix);
  placedObject.quaternion.slerp(targetQuat, 0.8);
}

function ensurePlacedObject() {
  if (placedObject) return;
  placedObject = createFallbackObject();
  scene.add(placedObject);
}

function getControllerRay() {
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  const rayOrigin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
  const rayDirection = new THREE.Vector3(0, 0, -1).applyMatrix4(tempMatrix).normalize();
  raycaster.set(rayOrigin, rayDirection);
}

function setPlacedObjectPoseFromFloorRay() {
  if (!placedObject) return;
  getControllerRay();
  const hitPoint = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(floorPlane, hitPoint);
  if (hit) {
    placedObject.position.copy(hitPoint);
  }
}

controller.addEventListener('selectstart', () => {
  isDragging = true;
  ensurePlacedObject();
  if (useAR) {
    setPlacedObjectPoseFromReticle();
  } else if (useVR) {
    setPlacedObjectPoseFromFloorRay();
  }
});

controller.addEventListener('selectend', () => {
  isDragging = false;
});

// Optional: simple reset button
const resetBtn = document.createElement('button');
resetBtn.textContent = 'Reset Model';
resetBtn.onclick = () => {
  if (placedObject) {
    scene.remove(placedObject);
    placedObject = null;
  }
};
buttonsRoot.appendChild(resetBtn);

// XR Buttons: prefer AR; fall back to VR (for web browser without AR)
async function setupXRButtons() {
  let arSupported = false;
  let vrSupported = false;
  if (navigator.xr && navigator.xr.isSessionSupported) {
    try { arSupported = await navigator.xr.isSessionSupported('immersive-ar'); } catch {}
    try { vrSupported = await navigator.xr.isSessionSupported('immersive-vr'); } catch {}
  }
  if (arSupported) {
    useAR = true;
    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.body }
    });
    buttonsRoot.appendChild(arButton);
    statusEl.textContent = 'Aim at floor. Trigger to place/drag.';
  } else if (vrSupported) {
    useVR = true;
    const vrButton = VRButton.createButton(renderer);
    buttonsRoot.appendChild(vrButton);
    gridHelper.visible = true;
    statusEl.textContent = 'VR fallback: Trigger to place/drag on floor grid.';
  } else {
    statusEl.textContent = 'WebXR not supported.';
  }
}
setupXRButtons();

renderer.setAnimationLoop(render);

async function onSessionStart() {
  const session = renderer.xr.getSession();
  session.addEventListener('end', onSessionEnd);

  const urlToLoad = gltfUrl || defaultGlb;
  try {
    const model = await loadModel(urlToLoad);
    if (!placedObject) {
      placedObject = new THREE.Group();
      scene.add(placedObject);
    }
    // Remove cube fallback children if any
    placedObject.children
      .filter(ch => ch.isMesh && ch.geometry && ch.geometry.type === 'BoxGeometry')
      .forEach(ch => placedObject.remove(ch));
    placedObject.add(model);
  } catch (e) {
    console.warn('Failed to load model URL, using box fallback.', e);
  }

  if (useAR) {
    statusEl.textContent = 'Move controller to aim. Trigger to place or drag.';
    localReferenceSpace = await session.requestReferenceSpace('local');
    viewerSpace = await session.requestReferenceSpace('viewer');
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  } else if (useVR) {
    statusEl.textContent = 'VR: trigger to place/drag on floor grid.';
    gridHelper.visible = true;
    // Position initial object in front if not dragging yet
    if (placedObject && !isDragging) {
      placedObject.position.set(0, 0, -1);
    }
  }
}

function onSessionEnd() {
  hitTestSource = null;
  localReferenceSpace = null;
  viewerSpace = null;
  statusEl.textContent = 'Session ended. Tap AR to start again.';
}

renderer.xr.addEventListener('sessionstart', onSessionStart);
renderer.xr.addEventListener('sessionend', onSessionEnd);

function render(timestamp, frame) {
  if (useAR && frame && hitTestSource && localReferenceSpace) {
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(localReferenceSpace);
      if (pose) {
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
        if (isDragging) {
          setPlacedObjectPoseFromReticle();
        }
      }
    } else {
      reticle.visible = false;
    }
  }

  if (useVR && isDragging) {
    setPlacedObjectPoseFromFloorRay();
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


