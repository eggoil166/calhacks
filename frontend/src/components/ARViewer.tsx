'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

type XRSessionAny = XRSession & {
  requestHitTestSource?: (options: { space: XRReferenceSpace }) => Promise<XRHitTestSource>;
};
type XRFrameAny = XRFrame & {
  getHitTestResults?: (source: XRHitTestSource) => XRHitTestResult[];
};

interface ARViewerProps {
  stlUrl: string;
  stlBuffer?: ArrayBuffer;
  onClose: () => void;
}

const ARViewer: React.FC<ARViewerProps> = ({ stlUrl, stlBuffer, onClose }) => {
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const buttonRootRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Loading AR...');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!canvasRootRef.current || !buttonRootRef.current || !statusRef.current) return;
    
    setMounted(true);
    const canvasRoot = canvasRootRef.current;
    const buttonRoot = buttonRootRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    canvasRoot.appendChild(renderer.domElement);

    // Lighting to make the model readable in AR
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0.5, 1, 0.25);
    scene.add(directionalLight);

    // AR only - no VR helpers needed

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
    let placedObject: THREE.Group | null = null;
    let hitTestSource: XRHitTestSource | null = null;
    let localReferenceSpace: XRReferenceSpace | null = null;
    let viewerSpace: XRReferenceSpace | null = null;

    async function loadSTL(url: string) {
      const loader = new STLLoader();
      return new Promise<THREE.Object3D>((resolve, reject) => {
        loader.load(
          url,
          (geometry) => {
            geometry.computeVertexNormals();
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
            resolve(group);
          },
          undefined,
          (error) => {
            reject(error);
          }
        );
      });
    }

    function createFallbackObject(): THREE.Group {
      const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        roughness: 0.6, 
        metalness: 0.1 
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
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


    controller.addEventListener('selectstart', () => {
      isDragging = true;
      ensurePlacedObject();
      setPlacedObjectPoseFromReticle();
    });

    controller.addEventListener('selectend', () => {
      isDragging = false;
    });

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset Model';
    resetBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      padding: 10px 20px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: white;
      cursor: pointer;
      font-size: 14px;
    `;
    resetBtn.onclick = () => {
      if (placedObject) {
        scene.remove(placedObject);
        placedObject = null;
      }
    };
    buttonRoot.appendChild(resetBtn);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close AR';
    closeBtn.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
      padding: 10px 20px;
      background: rgba(255,100,100,0.2);
      border: 1px solid rgba(255,100,100,0.3);
      border-radius: 8px;
      color: #ff6b6b;
      cursor: pointer;
      font-size: 14px;
    `;
    closeBtn.onclick = onClose;
    buttonRoot.appendChild(closeBtn);

    // AR ONLY - Match main.js exactly
    async function setupARButton() {
      if (navigator.xr && navigator.xr.isSessionSupported) {
        try {
          const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
          if (arSupported) {
            const arButton = ARButton.createButton(renderer, {
              requiredFeatures: ['hit-test'],
              optionalFeatures: ['dom-overlay'],
              domOverlay: { root: document.body }
            });
            buttonRoot.appendChild(arButton);
            setStatus('Ready for AR - Click button to start');
          } else {
            setStatus('AR not supported on this device');
          }
        } catch {
          setStatus('AR setup failed');
        }
      } else {
        setStatus('WebXR not supported');
      }
    }
    setupARButton();

    async function onSessionStart() {
      const session = renderer.xr.getSession() as XRSessionAny;
      session.addEventListener('end', onSessionEnd);

      try {
        let model: THREE.Object3D;
        if (stlBuffer) {
          // Use buffer directly
          const loader = new STLLoader();
          const geometry = loader.parse(stlBuffer);
          geometry.computeVertexNormals();
          geometry.center();

          const material = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            metalness: 0.1,
            roughness: 0.6,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          geometry.computeBoundingBox();
          const bb = geometry.boundingBox!;
          const size = new THREE.Vector3().subVectors(bb.max, bb.min);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const target = 0.25;
          const scale = target / maxDim;
          mesh.scale.setScalar(scale);

          const group = new THREE.Group();
          group.add(mesh);
          model = group;
        } else if (stlUrl && stlUrl.trim()) {
          model = await loadSTL(stlUrl);
        } else {
          model = createFallbackObject();
        }
        
        if (!placedObject) {
          placedObject = new THREE.Group();
          scene.add(placedObject);
        }
        
        // Remove cube fallback children if any
        placedObject.children
          .filter((ch) => ch instanceof THREE.Mesh && ch.geometry?.type === 'BoxGeometry')
          .forEach((ch) => {
            placedObject?.remove(ch);
          });
        
        placedObject.add(model);
        placedObject.visible = true;
        
      } catch {
        ensurePlacedObject();
      }

      setStatus('Move controller to aim. Trigger to place or drag.');
      
      try {
        localReferenceSpace = await session.requestReferenceSpace('local');
        viewerSpace = await session.requestReferenceSpace('viewer');
        hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace! }) ?? null;
      } catch {
        localReferenceSpace = null;
        viewerSpace = null;
        hitTestSource = null;
      }
    }

    function onSessionEnd() {
      hitTestSource = null;
      localReferenceSpace = null;
      viewerSpace = null;
      setStatus('Session ended. Tap AR to start again.');
    }

    renderer.xr.addEventListener('sessionstart', onSessionStart);
    renderer.xr.addEventListener('sessionend', onSessionEnd);

    const render = (_timestamp: number, frame?: XRFrameAny) => {
      if (!mounted) return;

      if (frame && hitTestSource && localReferenceSpace) {
        const hitTestResults = frame.getHitTestResults?.(hitTestSource) ?? [];
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

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(render);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => mat.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
    };
  }, [stlUrl, stlBuffer, onClose]);

  if (!mounted) {
    return (
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          zIndex: 1000,
          background: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)'
        }}
      >
        <div className="tech-glass rounded-2xl p-8 tech-border">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading AR Viewer...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      zIndex: 1000,
      background: 'var(--bg-primary)'
    }}>
      <div ref={canvasRootRef} style={{ width: '100%', height: '100%' }} />
      <div ref={buttonRootRef} />
      <div 
        ref={statusRef}
        className="tech-glass tech-border"
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--text-primary)',
          padding: '12px 24px',
          borderRadius: '12px',
          fontSize: '14px',
          zIndex: 1001,
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-primary)',
          boxShadow: 'var(--shadow-glow)'
        }}
      >
        {status}
      </div>
    </div>
  );
};

export { ARViewer };
