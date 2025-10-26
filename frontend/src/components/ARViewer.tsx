'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

type XRInputSourceAny = XRInputSource & { gamepad?: Gamepad };
type XRSessionAny = XRSession & {
  requestHitTestSource?: (options: { space: XRReferenceSpace }) => Promise<XRHitTestSource>;
};
type XRFrameAny = XRFrame & {
  getHitTestResults?: (source: XRHitTestSource) => XRHitTestResult[];
};

interface ARViewerProps {
  stlUrl: string;
  onClose: () => void;
}

export function ARViewer({ stlUrl, onClose }: ARViewerProps) {
  const canvasRootRef = useRef<HTMLDivElement | null>(null);
  const buttonRootRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState('checking AR support…');

  useEffect(() => {
    let mounted = true;

    const buttonRoot = buttonRootRef.current;
    const canvasRoot = canvasRootRef.current;

    // --- three.js setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // IMPORTANT: transparent clear so Quest passthrough shows
    renderer.setClearColor(0x000000, 0); // alpha = 0
    // (optional) ensure canvas itself isn't given an opaque bg
    renderer.domElement.style.background = 'transparent';

    canvasRoot?.appendChild(renderer.domElement);

    // --- lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0.5, 1, 0.25);
    scene.add(directionalLight);

    // --- reticle for hit-test ---
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4af2a1, transparent: true, opacity: 0.9 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // --- controller ---
    const controller = renderer.xr.getController(0);
    scene.add(controller);

    // --- state ---
    let isDragging = false;
    let placedObject: THREE.Group | null = null;
    let hitTestSource: XRHitTestSource | null = null;
    let localReferenceSpace: XRReferenceSpace | null = null;
    let viewerSpace: XRReferenceSpace | null = null;

    // --- helpers ---
    function createFallbackObject(): THREE.Group {
      console.log('🔧 Creating fallback cube...');
      
      const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, // RED for visibility
        roughness: 0.6, 
        metalness: 0.1 
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      const group = new THREE.Group();
      group.add(mesh);
      
      console.log('✅ Fallback cube created:', group);
      console.log('📍 Cube position:', mesh.position);
      console.log('👁️ Cube visible:', mesh.visible);
      return group;
    }

    function ensurePlacedObject() {
      if (placedObject) return;
      placedObject = createFallbackObject();
      scene.add(placedObject);
    }

    // STL loader + scale/center to ~25cm max dimension
    async function loadSTL(url: string) {
      console.log('🔧 Loading STL from URL:', url);
      
      const loader = new STLLoader();
      return new Promise<THREE.Object3D>((resolve, reject) => {
        loader.load(
          url,
          (geometry) => {
            console.log('✅ STL geometry loaded:', geometry);
            geometry.computeVertexNormals();
            // Center geometry to origin
            geometry.center();

            const material = new THREE.MeshStandardMaterial({
              color: 0x3b82f6,
              metalness: 0.1,
              roughness: 0.6,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            // Autoscale to ~0.25m max dimension
            geometry.computeBoundingBox();
            const bb = geometry.boundingBox!;
            const size = new THREE.Vector3().subVectors(bb.max, bb.min);
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const target = 0.25; // meters
            const scale = target / maxDim;
            mesh.scale.setScalar(scale);

            const group = new THREE.Group();
            group.add(mesh);
            
            console.log('✅ STL model created:', group);
            console.log('📏 Model scale:', scale);
            console.log('📍 Model position:', mesh.position);
            resolve(group);
          },
          undefined,
          (error) => {
            console.error('❌ STL loading failed:', error);
            reject(error);
          }
        );
      });
    }


    function setPlacedObjectPoseFromReticle() {
      if (!placedObject || !reticle.visible) return;
      placedObject.position.setFromMatrixPosition(reticle.matrix);
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(reticle.matrix);
      placedObject.quaternion.slerp(targetQuat, 0.8);
    }

    // --- controller events (Quest trigger) ---
    controller.addEventListener('selectstart', () => {
      isDragging = true;
      ensurePlacedObject();
      setPlacedObjectPoseFromReticle();
    });

    controller.addEventListener('selectend', () => {
      isDragging = false;
    });

    // --- UI buttons ---
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Model';
    Object.assign(resetBtn.style, {
      padding: '10px 14px',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      background: 'white',
      cursor: 'pointer',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
    });
    resetBtn.onclick = () => {
      if (placedObject) {
        scene.remove(placedObject);
        placedObject = null;
      }
    };
    buttonRoot?.appendChild(resetBtn);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close AR';
    Object.assign(closeBtn.style, {
      padding: '10px 14px',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      background: 'white',
      cursor: 'pointer',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
    });
    closeBtn.onclick = () => onClose();
    buttonRoot?.appendChild(closeBtn);

    // --- AR only ---
    async function setupAR() {
      let arSupported = false;
      if (navigator.xr?.isSessionSupported) {
        try {
          arSupported = await navigator.xr.isSessionSupported('immersive-ar');
        } catch {
          arSupported = false;
        }
      }
      if (!arSupported) {
        setStatus('WebXR AR not supported on this device/browser.');
        return;
      }

      const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body },
      });
      buttonRoot?.appendChild(arButton);
      setStatus('Aim at a surface. Trigger = place/drag. Grip+stick = rotate/scale.');
    }

    setupAR();

    // --- session lifecycle ---
    async function onSessionStart() {
      console.log('🎯 XR Session started');
      const session = renderer.xr.getSession() as XRSessionAny;
      session.addEventListener('end', onSessionEnd);

      console.log('📦 Loading model:', stlUrl || 'fallback cube');
      
      try {
        let model: THREE.Object3D;
        if (stlUrl && stlUrl.trim()) {
          model = await loadSTL(stlUrl);
          console.log('✅ STL model loaded successfully');
        } else {
          model = createFallbackObject();
          console.log('✅ Using fallback cube');
        }
        
        if (!placedObject) {
          placedObject = new THREE.Group();
          scene.add(placedObject);
          console.log('📦 Created placed object group');
        }
        
        // Remove cube fallback children if any
        placedObject.children
          .filter((ch) => ch instanceof THREE.Mesh && ch.geometry?.type === 'BoxGeometry')
          .forEach((ch) => {
            placedObject?.remove(ch);
            console.log('🗑️ Removed old fallback cube');
          });
        
        placedObject.add(model);
        console.log('✅ Model added to scene');
        
        // Ensure model is visible
        placedObject.visible = true;
        console.log('👁️ Model visibility set to true');
        
      } catch (e) {
        console.error('❌ Failed to load model, using cube fallback.', e);
        ensurePlacedObject();
      }

      setStatus('Move controller to aim. Trigger=place/drag, Grip+stick=rotate/scale.');

      // reference spaces + hit test
      localReferenceSpace = await session.requestReferenceSpace('local-floor').catch(() => session.requestReferenceSpace('local'));
      viewerSpace = await session.requestReferenceSpace('viewer');
      hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace! }) ?? null;

      session.addEventListener('end', onSessionEnd);
    }

    function onSessionEnd() {
      hitTestSource = null;
      localReferenceSpace = null;
      viewerSpace = null;
      setStatus('Session ended. Tap AR to start again.');
    }

    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);

    // --- Quest 2 control logic: Grip + Right Stick to rotate/scale ---
    function updateOculusControls(session: XRSession, obj: THREE.Object3D, dt: number) {
      const sources = session.inputSources as unknown as XRInputSourceAny[];
      const withPad = sources.filter((s) => s.gamepad);
      if (withPad.length === 0) return;

      const src = withPad.find((s) => s.handedness === 'right') ?? withPad[0];
      const gp = src.gamepad!;
      const axes = gp.axes || [];

      const stickX = (axes[2] ?? axes[0] ?? 0); // yaw
      const stickY = (axes[3] ?? axes[1] ?? 0); // scale
      const gripPressed = gp.buttons?.[1]?.pressed ?? false;

      if (gripPressed) {
        const rotSpeed = Math.PI; // rad/s
        obj.rotateY(-stickX * rotSpeed * dt);

        const scaleSpeed = 1.6;
        const current = obj.scale.x;
        const next = THREE.MathUtils.clamp(current * (1 + stickY * scaleSpeed * dt), 0.02, 10);
        obj.scale.setScalar(next);
      }
    }

    // --- render loop ---
    let lastTs = 0;
    const render = (timestamp: number, frame?: XRFrameAny) => {
      if (!mounted) return;
      const dt = lastTs ? (timestamp - lastTs) / 1000 : 0.016;
      lastTs = timestamp;

      // Debug: Log render calls occasionally
      if (Math.floor(timestamp / 1000) % 5 === 0 && Math.floor(timestamp) % 1000 < 50) {
        console.log('🎬 Render called - timestamp:', timestamp, 'frame:', !!frame);
      }

      if (frame && hitTestSource && localReferenceSpace) {
        const hits = frame.getHitTestResults?.(hitTestSource) ?? [];
        if (hits.length > 0) {
          const hit = hits[0];
          const pose = hit.getPose(localReferenceSpace);
          if (pose) {
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
            if (isDragging) setPlacedObjectPoseFromReticle();
          }
        } else {
          reticle.visible = false;
        }
      }

      const session = renderer.xr.getSession();
      if (session && placedObject) {
        updateOculusControls(session, placedObject, dt);
      }

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(render);

    // --- resize ---
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // --- cleanup ---
    return () => {
      mounted = false;
      try { 
        renderer.setAnimationLoop(null); 
      } catch {
        // Ignore cleanup errors
      }
      window.removeEventListener('resize', onResize);
      renderer.xr.removeEventListener('sessionstart', onSessionStart);
      renderer.xr.removeEventListener('sessionend', onSessionEnd);

      if (buttonRoot) buttonRoot.innerHTML = '';
      if (canvasRoot && renderer.domElement.parentElement === canvasRoot) {
        canvasRoot.removeChild(renderer.domElement);
      }

      reticle.geometry.dispose();
      (reticle.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [stlUrl, onClose]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={canvasRootRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
          fontSize: 14,
          maxWidth: 360,
          lineHeight: 1.3,
        }}
      >
        {status}
      </div>
      <div
        ref={buttonRootRef}
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      />
    </div>
  );
}
