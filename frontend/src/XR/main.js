import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { updateXRControls } from './xrControls.js';

const appRoot = document.getElementById('app');
const buttonsRoot = document.getElementById('buttons');
const statusEl = document.getElementById('status');

// Speech-to-text setup
let recognition = null;
let isListening = false;
let speechOverlay = null;
let micButton = null;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    console.log('🎤 Speech recognition started');
    if (speechOverlay) speechOverlay.textContent = 'Listening...';
    if (micButton) micButton.classList.add('listening');
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    const displayText = (finalTranscript + interimTranscript).trim();
    if (speechOverlay && displayText) {
      speechOverlay.textContent = `"${displayText}"`;
    }
    
    if (finalTranscript) {
      const finalText = finalTranscript.trim();
      console.log('📝 Final transcript:', finalText);
      
      // Call LLM and generate audio response
      (async () => {
        try {
          // Call the LLM API with the transcribed text
          const response = await fetch('http://127.0.0.1:5000/api/generate_scad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: finalText })
          });
          
          if (!response.ok) {
            console.error('LLM API failed:', response.statusText);
            return;
          }
          
          const data = await response.json();
          console.log('LLM response:', data);
          
          // If there's a description, generate audio
          if (data.description && data.description.trim()) {
            const audioResponse = await fetch('http://127.0.0.1:5000/api/text-to-speech', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: data.description })
            });
            
            if (!audioResponse.ok) {
              console.error('Audio generation failed:', audioResponse.statusText);
              return;
            }
            
            const audioBlob = await audioResponse.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            await audio.play();
            
            console.log('✅ Audio played successfully');
          }
        } catch (err) {
          console.error('Error processing voice command:', err);
        }
      })();
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    isListening = false;
    if (micButton) micButton.classList.remove('listening');
    if (speechOverlay) {
      speechOverlay.textContent = event.error === 'no-speech' ? 'No speech detected' : 'Speech error';
      setTimeout(() => { if (speechOverlay) speechOverlay.textContent = ''; }, 2000);
    }
  };

  recognition.onend = () => {
    isListening = false;
    console.log('🎤 Speech recognition ended');
    if (micButton) micButton.classList.remove('listening');
    if (speechOverlay) {
      setTimeout(() => { if (speechOverlay) speechOverlay.textContent = ''; }, 1000);
    }
  };
}

function startSpeech() {
  if (!recognition) {
    console.warn('Speech recognition not available');
    return;
  }
  if (!isListening) {
    try {
      recognition.start();
    } catch (e) {
      console.error('Failed to start speech:', e);
    }
  }
}

function stopSpeech() {
  if (recognition && isListening) {
    recognition.stop();
  }
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 20);

console.log('🎬 Scene created:', scene);
console.log('📷 Camera created:', camera);
console.log('📍 Camera position:', camera.position);
console.log('👁️ Camera looking at:', camera.getWorldDirection(new THREE.Vector3()));

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
appRoot.appendChild(renderer.domElement);

console.log('🎨 Renderer created and attached to DOM');
console.log('📏 Renderer size:', window.innerWidth, 'x', window.innerHeight);
console.log('🎯 App root element:', appRoot);
console.log('🖼️ Canvas element:', renderer.domElement);

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
let isDesktopMode = false;
let controls = null;

const params = new URLSearchParams(location.search);
const gltfUrl = params.get('model');
const stlUrl = params.get('stl'); // Support STL files via URL parameter
const defaultGlb = 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb';

// Real STL loader using STLLoader
async function loadSTLFromData(arrayBuffer) {
  console.log('🔧 Loading STL from data...');
  
  return new Promise((resolve, reject) => {
    const loader = new STLLoader();
    
    loader.load(
      URL.createObjectURL(new Blob([arrayBuffer])),
      (geometry) => {
        console.log('✅ STL geometry loaded:', geometry);
        
        // Create material
        const material = new THREE.MeshStandardMaterial({ 
          color: 0x3b82f6, 
          roughness: 0.6, 
          metalness: 0.1 
        });
        
        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Auto-scale the model to reasonable size
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const target = 0.25; // 25cm max dimension
        const scale = target / maxDim;
        mesh.scale.setScalar(scale);
        
        // Center the model
        const center = box.getCenter(new THREE.Vector3());
        mesh.position.sub(center);
        
        const root = new THREE.Group();
        root.add(mesh);
        
        console.log('✅ STL model created:', root);
        console.log('📏 Model scale:', scale);
        console.log('📍 Model position:', mesh.position);
        resolve(root);
      },
      undefined,
      (error) => {
        console.error('❌ STL loading failed:', error);
        reject(error);
      }
    );
  });
}

// Simple STL loader - just create a cube directly
function createSTLCube() {
  console.log('🔧 Creating STL cube directly...');
  
  // Create a simple cube geometry - make it bigger and more visible
  const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const material = new THREE.MeshStandardMaterial({ 
    color: 0xff0000, // RED for visibility
    roughness: 0.6, 
    metalness: 0.1 
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  // Position the cube where it can be seen
  mesh.position.set(0, 0.25, -1); // In front of camera
  
  const root = new THREE.Group();
  root.add(mesh);
  
  console.log('✅ STL cube created:', root);
  console.log('📍 Cube position:', mesh.position);
  console.log('👁️ Cube visible:', mesh.visible);
  return root;
}

async function loadModel(url) {
  return new Promise((resolve, reject) => {
    const isSTL = url.toLowerCase().endsWith('.stl');
    
    if (isSTL) {
      // Load STL file
      const loader = new STLLoader();
      loader.load(url, (geometry) => {
        // Create material for STL
        const material = new THREE.MeshStandardMaterial({ 
          color: 0x3b82f6, 
          roughness: 0.6, 
          metalness: 0.1 
        });
        
        // Create mesh from STL geometry
        const mesh = new THREE.Mesh(geometry, material);
        
        // Scale model to a reasonable size (~25cm max dimension)
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const target = 0.25;
        const scale = target / maxDim;
        mesh.scale.setScalar(scale);
        
        // Enable shadows
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Create group to match GLTF structure
        const root = new THREE.Group();
        root.add(mesh);
        resolve(root);
      }, undefined, reject);
    } else {
      // Load GLB/GLTF file
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
    }
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

function updateMouseFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  return pointer;
}

function setPlacedObjectPoseFromMouse(pointer) {
  if (!placedObject) return;
  raycaster.setFromCamera(pointer, camera);
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

// Speech-to-text UI overlay
if (recognition) {
  // Create speech overlay (shows transcription)
  speechOverlay = document.createElement('div');
  speechOverlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 18px;
    font-weight: 500;
    max-width: 80%;
    text-align: center;
    pointer-events: none;
    z-index: 100;
    display: none;
  `;
  document.body.appendChild(speechOverlay);

  // Create mic button
  micButton = document.createElement('button');
  micButton.innerHTML = '🎤';
  micButton.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    border: 3px solid #4af2a1;
    font-size: 28px;
    cursor: pointer;
    z-index: 100;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  micButton.onclick = () => {
    if (isListening) {
      stopSpeech();
    } else {
      startSpeech();
      if (speechOverlay) {
        speechOverlay.style.display = 'block';
      }
    }
  };
  document.body.appendChild(micButton);

  // Add listening animation style
  const style = document.createElement('style');
  style.textContent = `
    button.listening {
      background: #4af2a1 !important;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(74, 242, 161, 0.5); }
      50% { transform: scale(1.1); box-shadow: 0 6px 20px rgba(74, 242, 161, 0.8); }
    }
  `;
  document.head.appendChild(style);

  // Update overlay visibility based on listening state
  const originalOnStart = recognition.onstart;
  recognition.onstart = () => {
    originalOnStart();
    if (speechOverlay) speechOverlay.style.display = 'block';
  };

  const originalOnEnd = recognition.onend;
  recognition.onend = () => {
    originalOnEnd();
    if (speechOverlay) {
      setTimeout(() => { 
        if (speechOverlay && !isListening) speechOverlay.style.display = 'none'; 
      }, 1500);
    }
  };
}

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
    // Desktop fallback (no WebXR): orbit controls and mouse drag on floor
    isDesktopMode = true;
    gridHelper.visible = true;
    statusEl.textContent = 'Desktop preview: left-drag places/moves model; scroll to zoom; right-drag to orbit.';

    camera.position.set(0.6, 1.6, 2.2);
    camera.lookAt(0, 1, 0);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);
    controls.update();

    let mouseDragging = false;
    renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // left only
      mouseDragging = true;
      ensurePlacedObject();
      const p = updateMouseFromEvent(e);
      setPlacedObjectPoseFromMouse(p);
    });
    window.addEventListener('mousemove', (e) => {
      if (!mouseDragging) return;
      const p = updateMouseFromEvent(e);
      setPlacedObjectPoseFromMouse(p);
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      mouseDragging = false;
    });
  }
}
setupXRButtons();

// Setup STL file upload
const loadSTLBtn = document.getElementById('loadSTLBtn');
const testSTLBtn = document.getElementById('testSTLBtn');
const stlFileInput = document.getElementById('stlFileInput');

if (loadSTLBtn && stlFileInput) {
  loadSTLBtn.addEventListener('click', () => {
    stlFileInput.click();
  });

  stlFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📁 Loading STL file:', file.name, 'Size:', file.size, 'bytes');
    statusEl.textContent = 'Loading STL file...';

    try {
      // Load the actual STL file
      const arrayBuffer = await file.arrayBuffer();
      console.log('📦 STL file array buffer size:', arrayBuffer.byteLength);
      
      const model = await loadSTLFromData(arrayBuffer);
      console.log('✅ STL model created:', model);
      
      // Replace current model
      if (placedObject) {
        console.log('🔄 Replacing existing model in placedObject');
        // Remove existing children
        while (placedObject.children.length > 0) {
          const child = placedObject.children[0];
          placedObject.remove(child);
          console.log('🗑️ Removed child:', child.type);
        }
        placedObject.add(model);
        placedObject.visible = true;
        placedObject.position.set(0, 0, -1); // Position in front of camera
        console.log('✅ STL file loaded and added to scene');
        console.log('📍 PlacedObject position:', placedObject.position);
        console.log('👁️ PlacedObject visible:', placedObject.visible);
        statusEl.textContent = 'STL file loaded successfully!';
      } else {
        console.log('🆕 Creating new placed object for STL');
        // Create new placed object
        placedObject = new THREE.Group();
        placedObject.add(model);
        placedObject.visible = true;
        placedObject.position.set(0, 0, -1); // Position in front of camera
        scene.add(placedObject);
        console.log('✅ STL file loaded and created new object');
        console.log('📍 PlacedObject position:', placedObject.position);
        console.log('👁️ PlacedObject visible:', placedObject.visible);
        statusEl.textContent = 'STL file loaded successfully!';
      }
      
      // Reset file input
      stlFileInput.value = '';
      
    } catch (error) {
      console.error('❌ Failed to load STL file:', error);
      statusEl.textContent = 'Failed to load STL file: ' + error.message;
    }
  });
}

// Test STL loading with a simple cube
if (testSTLBtn) {
  testSTLBtn.addEventListener('click', () => {
    console.log('🧪 Testing STL loading with simple cube...');
    statusEl.textContent = 'Loading test cube...';
    
    try {
      // Create a simple test STL cube using real STL geometry
      const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0x00ff00, // GREEN for test
        roughness: 0.6, 
        metalness: 0.1 
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      const root = new THREE.Group();
      root.add(mesh);
      
      console.log('✅ Test STL model created:', root);
      
      // Replace current model
      if (placedObject) {
        console.log('🔄 Replacing existing model with test cube');
        // Remove existing children
        while (placedObject.children.length > 0) {
          const child = placedObject.children[0];
          placedObject.remove(child);
          console.log('🗑️ Removed child:', child.type);
        }
        placedObject.add(root);
        placedObject.visible = true;
        placedObject.position.set(0, 0, -1); // Position in front of camera
        console.log('✅ Test cube loaded and added to scene');
        console.log('📍 PlacedObject position:', placedObject.position);
        console.log('👁️ PlacedObject visible:', placedObject.visible);
        statusEl.textContent = 'Test cube loaded successfully!';
      } else {
        console.log('🆕 Creating new placed object for test cube');
        // Create new placed object
        placedObject = new THREE.Group();
        placedObject.add(root);
        placedObject.visible = true;
        placedObject.position.set(0, 0, -1); // Position in front of camera
        scene.add(placedObject);
        console.log('✅ Test cube loaded and created new object');
        console.log('📍 PlacedObject position:', placedObject.position);
        console.log('👁️ PlacedObject visible:', placedObject.visible);
        statusEl.textContent = 'Test cube loaded successfully!';
      }
      
    } catch (error) {
      console.error('❌ Failed to load test cube:', error);
      statusEl.textContent = 'Failed to load test cube: ' + error.message;
    }
  });
}

// Debug button
const debugBtn = document.getElementById('debugBtn');
if (debugBtn) {
  debugBtn.addEventListener('click', () => {
    console.log('🐛 Debug Scene Info:');
    console.log('📍 Camera position:', camera.position);
    console.log('👁️ Camera looking at:', camera.getWorldDirection(new THREE.Vector3()));
    console.log('📦 Scene children:', scene.children.length);
    console.log('🎯 PlacedObject:', placedObject);
    if (placedObject) {
      console.log('📍 PlacedObject position:', placedObject.position);
      console.log('👁️ PlacedObject visible:', placedObject.visible);
      console.log('👶 PlacedObject children:', placedObject.children.length);
    }
    console.log('🎨 Renderer info:', renderer.info);
    console.log('🖥️ Renderer size:', renderer.getSize(new THREE.Vector2()));
    console.log('🎬 Animation loop running:', renderer.getAnimationLoop() !== null);
  });
}

// Create a test object immediately to verify rendering works
function createTestObject() {
  console.log('🧪 Creating immediate test object...');
  
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red, no lighting needed
  const testCube = new THREE.Mesh(geometry, material);
  
  testCube.position.set(0, 0, -1); // In front of camera
  scene.add(testCube);
  
  console.log('✅ Test cube added to scene at position:', testCube.position);
  console.log('👁️ Test cube visible:', testCube.visible);
  
  return testCube;
}

// Create test object immediately
const testObject = createTestObject();

// Test render immediately
console.log('🎬 Testing immediate render...');
renderer.render(scene, camera);
console.log('✅ Immediate render completed');

renderer.setAnimationLoop(render);

// Simple test button
const simpleTestBtn = document.getElementById('simpleTestBtn');
if (simpleTestBtn) {
  simpleTestBtn.addEventListener('click', () => {
    console.log('🔴 Simple test button clicked');
    
    // Create a bright red cube that should be impossible to miss
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      wireframe: false
    });
    const cube = new THREE.Mesh(geometry, material);
    
    cube.position.set(0, 0, -2); // Further back so it's definitely visible
    scene.add(cube);
    
    console.log('🔴 Bright red cube added at position:', cube.position);
    console.log('🔴 Cube visible:', cube.visible);
    console.log('🔴 Scene children count:', scene.children.length);
    
    // Force a render
    renderer.render(scene, camera);
    console.log('🔴 Forced render completed');
    
    statusEl.textContent = 'Red cube added! Check console for details.';
  });
}

async function onSessionStart() {
  console.log('🎯 XR Session started');
  const session = renderer.xr.getSession();
  session.addEventListener('end', onSessionEnd);

  const urlToLoad = gltfUrl || stlUrl || defaultGlb;
  console.log('📦 Loading model:', urlToLoad);
  
  try {
    const model = await loadModel(urlToLoad);
    console.log('✅ Model loaded successfully');
    
    if (!placedObject) {
      placedObject = new THREE.Group();
      scene.add(placedObject);
      console.log('📦 Created placed object group');
    }
    
    // Remove cube fallback children if any
    placedObject.children
      .filter(ch => ch.isMesh && ch.geometry && ch.geometry.type === 'BoxGeometry')
      .forEach(ch => {
        placedObject.remove(ch);
        console.log('🗑️ Removed fallback cube');
      });
    
    placedObject.add(model);
    console.log('✅ Model added to scene');
    
    // Ensure model is visible
    placedObject.visible = true;
    console.log('👁️ Model visibility set to true');
    
  } catch (e) {
    console.error('❌ Failed to load model URL, using box fallback.', e);
    // Create fallback object
    if (!placedObject) {
      placedObject = createFallbackObject();
      scene.add(placedObject);
      console.log('📦 Created fallback cube');
    }
  }

  if (useAR) {
    console.log('🎯 Setting up AR session');
    statusEl.textContent = 'Move controller to aim. Trigger to place or drag.';
    
    try {
      localReferenceSpace = await session.requestReferenceSpace('local');
      viewerSpace = await session.requestReferenceSpace('viewer');
      hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
      console.log('✅ AR hit-test source created');
    } catch (e) {
      console.error('❌ Failed to setup AR hit-test:', e);
      statusEl.textContent = 'AR setup failed. Check console for details.';
    }
  } else if (useVR) {
    console.log('🥽 Setting up VR session');
    statusEl.textContent = 'VR: trigger to place/drag on floor grid.';
    gridHelper.visible = true;
    // Position initial object in front if not dragging yet
    if (placedObject && !isDragging) {
      placedObject.position.set(0, 0, -1);
      console.log('📍 Positioned object in VR space');
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

let lastTs = 0;
function render(timestamp, frame) {
  const dt = lastTs ? (timestamp - lastTs) / 1000 : 0.016;
  lastTs = timestamp;
  
  // Debug: Log render calls occasionally
  if (Math.floor(timestamp / 1000) % 5 === 0 && Math.floor(timestamp) % 1000 < 50) {
    console.log('🎬 Render called - timestamp:', timestamp, 'frame:', !!frame);
  }
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

  // XR controller-based rotate/scale (both AR and VR)
  const session = renderer.xr.getSession();
  if (session && placedObject) {
    updateXRControls(session, placedObject, dt);
    
    // Update status with current scale and control info
    const state = placedObject.userData.controlState;
    if (state) {
      const scalePercent = Math.round(state.scale * 100);
      let statusText = `Scale: ${scalePercent}%`;
      if (state.clipEnabled) {
        statusText += ` | Clipping: ON`;
      }
      if (state.placementLocked) {
        statusText += ` | Locked`;
      }
      statusEl.textContent = statusText;
    }
  }

  // Check for 'B' button press on controller to trigger speech
  if (session && recognition) {
    for (const source of session.inputSources) {
      const gp = source && source.gamepad;
      if (!gp) continue;
      const buttons = gp.buttons || [];
      // B button is typically at index 5 or 1
      const bPressed = (buttons[5] && buttons[5].pressed) || (buttons[1] && buttons[1].pressed);
      if (bPressed && !isListening) {
        startSpeech();
      } else if (!bPressed && isListening) {
        stopSpeech();
      }
    }
  }

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


