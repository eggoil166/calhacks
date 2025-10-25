import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { X } from 'lucide-react';

interface ARViewerProps {
  glbUrl: string;
  onClose: () => void;
}

// Fullscreen AR viewer using WebXR hit-test and controller drag
export function ARViewer({ glbUrl, onClose }: ARViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Initializing AR...');

  useEffect(() => {
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let reticle: THREE.Mesh | null = null;
    let placedRoot: THREE.Group | null = null;
    let isDragging = false;
    let hitTestSource: XRHitTestSource | null = null;

    const ensurePlacedRoot = () => {
      if (placedRoot) return;
      placedRoot = new THREE.Group();
      scene!.add(placedRoot);
    };

    const setFromReticle = () => {
      if (!placedRoot || !reticle || !reticle.visible) return;
      placedRoot.position.setFromMatrixPosition(reticle.matrix);
      const q = new THREE.Quaternion().setFromRotationMatrix(reticle.matrix);
      placedRoot.quaternion.copy(q);
    };

    const loadModel = async (url: string) => {
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url);
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const target = 0.15; // ~15 cm target size
      const scale = maxDim > 0 ? target / maxDim : 1;
      model.scale.setScalar(scale);
      return model;
    };

    const init = async () => {
      if (!containerRef.current) return;
      if (!navigator.xr) {
        setError('WebXR not supported in this browser');
        return;
      }
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!arSupported) {
        setError('AR not supported on this device');
        return;
      }

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      containerRef.current.appendChild(renderer.domElement);
      // ensure canvas fills the overlay
      Object.assign(renderer.domElement.style, {
        position: 'absolute',
        inset: '0px',
        width: '100%',
        height: '100%'
      } as CSSStyleDeclaration);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(0.5, 1, 0.25);
      scene.add(dir);

      // Reticle
      reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x4af2a1, transparent: true, opacity: 0.9 })
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      // Controller
      const controller = renderer.xr.getController(0);
      scene.add(controller);
      controller.addEventListener('selectstart', () => {
        isDragging = true;
        ensurePlacedRoot();
        setFromReticle();
      });
      controller.addEventListener('selectend', () => {
        isDragging = false;
      });

      // Start AR
      try {
        setStatus('Starting AR session...');
        const session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: containerRef.current as unknown as Element }
        });
        renderer.xr.setSession(session);

        // Hit test source
        const viewerSpace = await session.requestReferenceSpace('viewer');
        type SessionWithHitTest = XRSession & { requestHitTestSource: (opts: { space: XRReferenceSpace }) => Promise<XRHitTestSource> };
        const s = session as unknown as SessionWithHitTest;
        if (typeof s.requestHitTestSource !== 'function') {
          setError('Hit-test not available');
          return;
        }
        hitTestSource = (await s.requestHitTestSource({ space: viewerSpace })) ?? null;

        session.addEventListener('end', () => onClose());

        // Load astronaut or provided GLB
        try {
          const url = glbUrl || 'https://modelviewer.dev/shared-assets/models/NeilArmstrong.glb';
          setStatus('Loading model...');
          const model = await loadModel(url);
          ensurePlacedRoot();
          placedRoot!.add(model);
          setStatus('Aim at floor. Hold trigger to drag.');
        } catch (e) {
          setError('Failed to load model');
          console.error(e);
        }

        // Render loop
        renderer.setAnimationLoop((_ts, frame) => {
          if (!renderer || !scene || !camera) return;
          if (!frame || !hitTestSource) {
            renderer.render(scene, camera);
            return;
          }
          const baseSpace = renderer.xr.getReferenceSpace();
          if (!baseSpace) {
            renderer.render(scene, camera);
            return;
          }
          const results = frame.getHitTestResults(hitTestSource);
          if (results.length > 0) {
            const pose = results[0].getPose(baseSpace);
            if (pose && reticle) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
              if (isDragging) setFromReticle();
            }
          } else if (reticle) {
            reticle.visible = false;
          }
          renderer.render(scene, camera);
        });
      } catch (err) {
        setError('Failed to start AR session');
        console.error(err);
      }

      const onResize = () => {
        if (!renderer || !camera) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);
      // lock body scroll while overlay is shown
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevBodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('resize', onResize);
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.overflow = prevBodyOverflow;
      };
    };

    init();

    return () => {
      if (renderer) {
        const s = renderer.xr.getSession();
        if (s) s.end();
        renderer.dispose();
      }
    };
  }, [glbUrl, onClose]);

  return (
    <div ref={containerRef} className="fixed inset-0 w-screen h-screen bg-black z-50">
      <div className="absolute top-4 right-4">
        <button
          onClick={onClose}
          className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 transition-colors"
        >
          <X className="w-6 h-6 text-gray-800" />
        </button>
      </div>
      {status && !error && (
        <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 text-sm font-medium text-gray-800">
          {status}
        </div>
      )}
      {error && (
        <div className="absolute top-16 left-4 right-4 bg-red-500 text-white rounded-lg px-4 py-3">
          {error}
        </div>
      )}
    </div>
  );
}
