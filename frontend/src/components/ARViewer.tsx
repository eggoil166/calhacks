'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// minimal type guards when TS lib lacks WebXR extras
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
    
    // Capture refs at the beginning to avoid stale closure issues
    const buttonRoot = buttonRootRef.current;
    const canvasRoot = canvasRootRef.current;

    // --- three.js setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    canvasRoot?.appendChild(renderer.domElement);

    // --- lighting (simple, AR-friendly) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0.5, 1, 0.25);
    scene.add(directionalLight);

    // --- hit-test reticle ---
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4af2a1, transparent: true, opacity: 0.9 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // --- AR controller (index trigger to place/drag) ---
    const controller = renderer.xr.getController(0);
    scene.add(controller);

    // --- state ---
    let isDragging = false;
    let placedObject: THREE.Group | null = null;
    let hitTestSource: XRHitTestSource | null = null;
    let localReferenceSpace: XRReferenceSpace | null = null;
    let viewerSpace: XRReferenceSpace | null = null;

    // Use the provided STL URL or fallback to default
    const gltfUrl = stlUrl || 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb';

    // --- helpers ---
    function createFallbackObject(): THREE.Group {
      // simple cube fallback if model fails
      const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const material = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6, metalness: 0.1 });
      const mesh = new THREE.Mesh(geometry, material);
      const group = new THREE.Group();
      group.add(mesh);
      return group;
    }

    function ensurePlacedObject() {
      if (placedObject) return;
      placedObject = createFallbackObject();
      scene.add(placedObject);
    }

    async function loadModel(url: string) {
      const loader = new GLTFLoader();
      return new Promise<THREE.Object3D>((resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            const root = gltf.scene;
            // scale to ~25cm max dimension so it looks reasonable in AR
            const box = new THREE.Box3().setFromObject(root);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const target = 0.25;
            const scale = target / maxDim;
            root.scale.setScalar(scale);
            root.traverse((obj: THREE.Object3D) => {
              if (obj instanceof THREE.Mesh) {
                obj.castShadow = true;
                obj.receiveShadow = true;
              }
            });
            resolve(root);
          },
          undefined,
          reject
        );
      });
    }

    function setPlacedObjectPoseFromReticle() {
      if (!placedObject || !reticle.visible) return;
      placedObject.position.setFromMatrixPosition(reticle.matrix);
      const targetQuat = new THREE.Quaternion().setFromRotationMatrix(reticle.matrix);
      placedObject.quaternion.slerp(targetQuat, 0.8);
    }

    // --- controller events (quest 2 trigger) ---
    controller.addEventListener('selectstart', () => {
      isDragging = true;
      ensurePlacedObject();
      setPlacedObjectPoseFromReticle();
    });

    controller.addEventListener('selectend', () => {
      isDragging = false;
    });

    // --- reset button ---
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

    // --- close button ---
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
    closeBtn.onclick = () => {
      onClose();
    };
    buttonRoot?.appendChild(closeBtn);

    // --- AR only (no VR/fallback) ---
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
        setStatus('webxr AR not supported on this device/browser.');
        return;
      }

      // quest passthrough AR via immersive-ar
      const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'], // hit-test is needed for reticle placement
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body },
      });
      buttonRoot?.appendChild(arButton);
      setStatus('aim at a surface. press trigger to place/drag. grip+stick to rotate/scale.');
    }

    setupAR();

    // --- session lifecycle ---
    async function onSessionStart() {
      const session = renderer.xr.getSession() as XRSessionAny;

      // load model or use cube fallback
      const urlToLoad = gltfUrl;
      try {
        const model = await loadModel(urlToLoad);
        if (!placedObject) {
          placedObject = new THREE.Group();
          scene.add(placedObject);
        }
        // remove any cube fallback children if present
        placedObject.children
          .filter(ch => ch instanceof THREE.Mesh && ch.geometry?.type === 'BoxGeometry')
          .forEach(ch => placedObject?.remove(ch));
        placedObject.add(model);
      } catch (e) {
        console.warn('failed to load model, using cube fallback.', e);
        ensurePlacedObject();
      }

      setStatus('move controller to aim. trigger=place/drag, grip+stick=rotate/scale');

      localReferenceSpace = await session.requestReferenceSpace('local');
      viewerSpace = await session.requestReferenceSpace('viewer');
      hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace! }) ?? null;

      session.addEventListener('end', onSessionEnd);
    }

    function onSessionEnd() {
      hitTestSource = null;
      localReferenceSpace = null;
      viewerSpace = null;
      setStatus('session ended. tap AR to start again.');
    }

    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);

    // --- quest 2 control logic (in-file) ---
    // grip + right thumbstick: rotate (x) / scale (y)
    function updateOculusControls(session: XRSession, obj: THREE.Object3D, dt: number) {
      // find a right-hand input source with a gamepad (quest 2 controller)
      const sources = session.inputSources as unknown as XRInputSourceAny[];
      const withPad = sources.filter(s => s.gamepad);
      if (withPad.length === 0) return;

      // prefer right hand, else first available
      const src =
        withPad.find(s => s.handedness === 'right') ??
        withPad[0];

      const gp = src.gamepad!;
      const axes = gp.axes || [];
      // most quest mappings expose the thumbstick on axes[2] (x), axes[3] (y),
      // but some browsers use axes[0], axes[1]. we try both for safety.
      const stickX = (axes[2] ?? axes[0] ?? 0);
      const stickY = (axes[3] ?? axes[1] ?? 0);

      // button[0] ~ trigger, button[1] ~ grip/squeeze on quest touch controllers
      const gripPressed = gp.buttons?.[1]?.pressed ?? false;

      // rotate/scale only while grip is held to avoid accidental changes
      if (gripPressed) {
        // rotation: yaw around Y (left/right on stick)
        const rotSpeed = Math.PI; // radians per second at full deflection
        obj.rotateY(-stickX * rotSpeed * dt);

        // scale: up/down on stick; uniform scaling, clamped
        const scaleSpeed = 1.6; // 160% per second at full up, 40% per second down (negative)
        const current = obj.scale.x;
        // exponential-ish feel via multiplicative step
        const next = THREE.MathUtils.clamp(current * (1 + stickY * scaleSpeed * dt), 0.02, 10);
        obj.scale.setScalar(next);
      }

      // note: trigger is handled via controller 'selectstart/selectend' (drag logic)
      // but if you want continuous "drag while held" fallback, we already set isDragging via events
    }

    // --- render loop ---
    let lastTs = 0;
    const render = (timestamp: number, frame?: XRFrameAny) => {
      if (!mounted) return;
      const dt = lastTs ? (timestamp - lastTs) / 1000 : 0.016;
      lastTs = timestamp;

      // hit-test / reticle update
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

      // per-frame quest control handling
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
      {/* webgl canvas root */}
      <div ref={canvasRootRef} style={{ width: '100%', height: '100%' }} />

      {/* status badge */}
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

      {/* AR button + reset */}
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
