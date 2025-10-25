import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { X, Move, RotateCw, ZoomIn } from 'lucide-react';

interface ARViewerProps {
  glbUrl: string;
  onClose: () => void;
}

export function ARViewer({ glbUrl, onClose }: ARViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Initializing AR...');
  const sessionRef = useRef<XRSession | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let hitTestSource: XRHitTestSource | null = null;
    let reticle: THREE.Mesh | null = null;
    let placed = false;

    const init = async () => {
      if (!containerRef.current) return;

      if (!navigator.xr) {
        setError('WebXR not supported in this browser');
        return;
      }

      const isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!isARSupported) {
        setError('AR not supported on this device');
        return;
      }

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      containerRef.current.appendChild(renderer.domElement);

      const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      light.position.set(0.5, 1, 0.25);
      scene.add(light);

      const loader = new GLTFLoader();
      try {
        setStatus('Loading model...');
        const gltf = await loader.loadAsync(glbUrl);
        const model = gltf.scene;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 0.3 / maxDim;

        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.visible = false;

        modelRef.current = model;
        scene.add(model);
      } catch (err) {
        setError('Failed to load 3D model');
        console.error(err);
        return;
      }

      reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide })
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      try {
        setStatus('Starting AR session...');
        const session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: document.body }
        });

        sessionRef.current = session;
        renderer.xr.setSession(session);

        const referenceSpace = await session.requestReferenceSpace('viewer');
        const hitTestSpace = await session.requestHitTestSource({ space: referenceSpace });
        hitTestSource = hitTestSpace!;

        setStatus('Tap to place model');

        session.addEventListener('end', () => {
          sessionRef.current = null;
          onClose();
        });

        const onSelect = () => {
          if (!placed && reticle && reticle.visible && modelRef.current) {
            modelRef.current.position.setFromMatrixPosition(reticle.matrix);
            modelRef.current.visible = true;
            placed = true;
            setStatus('Drag to move, pinch to scale');
          }
        };

        session.addEventListener('select', onSelect);

        renderer.setAnimationLoop((timestamp, frame) => {
          if (!frame) return;

          const referenceSpace = renderer.xr.getReferenceSpace();
          if (!referenceSpace) return;

          if (hitTestSource && !placed) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0 && reticle) {
              const hit = hitTestResults[0];
              const pose = hit.getPose(referenceSpace);
              if (pose) {
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
              }
            }
          }

          renderer.render(scene, camera);
        });

      } catch (err) {
        setError('Failed to start AR session');
        console.error(err);
      }
    };

    init();

    return () => {
      if (sessionRef.current) {
        sessionRef.current.end();
      }
      if (renderer) {
        renderer.dispose();
      }
    };
  }, [glbUrl, onClose]);

  return (
    <div ref={containerRef} className="fixed inset-0 bg-black z-50">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="bg-white bg-opacity-90 rounded-lg px-4 py-2 text-sm font-medium text-gray-800">
          {status}
        </div>
        <button
          onClick={onClose}
          className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-colors"
        >
          <X className="w-6 h-6 text-gray-800" />
        </button>
      </div>

      {error && (
        <div className="absolute inset-x-4 top-20 bg-red-500 text-white rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="absolute bottom-8 left-4 right-4 bg-white bg-opacity-90 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-3">
          <Move className="w-5 h-5 text-gray-600" />
          <span className="text-sm text-gray-700">Drag to move</span>
        </div>
        <div className="flex items-center gap-3">
          <ZoomIn className="w-5 h-5 text-gray-600" />
          <span className="text-sm text-gray-700">Pinch to scale</span>
        </div>
        <div className="flex items-center gap-3">
          <RotateCw className="w-5 h-5 text-gray-600" />
          <span className="text-sm text-gray-700">Rotate with two fingers</span>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Navigator {
    xr?: XRSystem;
  }

  interface XRSystem {
    requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
    isSessionSupported(mode: XRSessionMode): Promise<boolean>;
  }

  interface XRSession extends EventTarget {
    requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>;
    requestHitTestSource(options: XRHitTestOptionsInit): Promise<XRHitTestSource>;
    end(): Promise<void>;
  }

  interface XRFrame {
    getHitTestResults(hitTestSource: XRHitTestSource): XRHitTestResult[];
    getPose(space: XRSpace, baseSpace: XRSpace): XRPose | undefined;
  }

  interface XRHitTestResult {
    getPose(baseSpace: XRSpace): XRPose | undefined;
  }

  interface XRPose {
    transform: XRRigidTransform;
  }

  interface XRRigidTransform {
    matrix: Float32Array;
  }

  type XRSessionMode = 'inline' | 'immersive-vr' | 'immersive-ar';
  type XRReferenceSpaceType = 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';

  interface XRSessionInit {
    requiredFeatures?: string[];
    optionalFeatures?: string[];
    domOverlay?: { root: Element };
  }

  interface XRHitTestOptionsInit {
    space: XRSpace;
  }

  type XRSpace = any;
  type XRReferenceSpace = any;
  type XRHitTestSource = any;
}
