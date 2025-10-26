import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  /** URL of the STL file */
  src?: string;
  /** STL file buffer for direct upload */
  stlBuffer?: ArrayBuffer;
  /** Container width */
  width?: number;
  /** Container height */
  height?: number;
  /** Mesh color */
  color?: string;
  /** Background color */
  backgroundColor?: string;
  /** Show upload button when no src provided */
  showUpload?: boolean;
  /** Callback when STL is loaded */
  onSTLLoaded?: (geometry: THREE.BufferGeometry) => void;
};

const STLPlaneViewer: React.FC<Props> = ({
  src,
  stlBuffer,
  width = 800,
  height = 600,
  color = "#c9d2ff",
  backgroundColor = "#0b0e14",
  showUpload = true,
  onSTLLoaded,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<OrbitControls>();
  const frameRef = useRef<number>();
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.stl')) {
      setUploadedFile(file);
      setStatus("loading");
    } else {
      setError("Please select a valid STL file.");
      setStatus("error");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene / Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 1.0);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(3, 6, 8);
    scene.add(hemi, dir);

    // Ground plane (3D plane)
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    plane.position.y = -2; // Position below the model
    plane.receiveShadow = true;
    scene.add(plane);

    // Grid helper for reference
    const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
    gridHelper.position.y = -1.99; // Slightly above the plane
    scene.add(gridHelper);

    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    dir.castShadow = true;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Mount
    mountRef.current.appendChild(renderer.domElement);

    // Resize handling
    const resize = () => {
      const el = mountRef.current!;
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mountRef.current);
    resize();

    // Render loop
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameRef.current!);
      ro.disconnect();
      controls.dispose();
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
  }, [width, height, backgroundColor]);

  // Load STL whenever src, stlBuffer, or uploadedFile changes
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    
    // Don't try to load if there's no STL data
    if (!src && !stlBuffer && !uploadedFile) {
      setStatus("idle");
      return;
    }
    
    const loadSTL = async () => {
      setStatus("loading");
      setError(null);

      const scene = sceneRef.current!;
      const camera = cameraRef.current!;
      const loader = new STLLoader();

      // Remove previous mesh if any
      const old = scene.getObjectByName("stl-root");
      if (old) scene.remove(old);

      try {
        let geometry: THREE.BufferGeometry;

        if (stlBuffer) {
          // Load from buffer
          geometry = loader.parse(stlBuffer);
        } else if (uploadedFile) {
          // Load from uploaded file
          const arrayBuffer = await uploadedFile.arrayBuffer();
          geometry = loader.parse(arrayBuffer);
        } else if (src) {
          // Load from URL
          geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
            loader.load(src, resolve, undefined, reject);
          });
        } else {
          throw new Error("No STL data provided");
        }

        geometry.computeVertexNormals();

        // Center and scale: put mesh around origin, fit to view
        geometry.center();
        const material = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.15,
          roughness: 0.6,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "stl-root";
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.y = 0; // Position on the plane
        scene.add(mesh);

        // Fit to view
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = maxDim * 2.5; // camera distance multiplier
        camera.position.set(dist, dist * 0.8, dist);
        camera.near = dist / 100;
        camera.far = dist * 100;
        camera.updateProjectionMatrix();

        // Controls target
        controlsRef.current!.target.copy(center);
        controlsRef.current!.update();

        setStatus("ready");
        
        // Callback for loaded geometry
        if (onSTLLoaded) {
          onSTLLoaded(geometry);
        }

      } catch (err) {
        console.error("STL load error:", err);
        setError("Failed to load STL. Check the file format and try again.");
        setStatus("error");
      }
    };

    loadSTL();
  }, [src, stlBuffer, uploadedFile, color, onSTLLoaded]);

  return (
    <div style={{ position: "relative", width, height }}>
      <div 
        ref={mountRef} 
        style={{ 
          width: "100%", 
          height: "100%", 
          background: backgroundColor,
          borderRadius: 8,
          overflow: "hidden"
        }}
      />
      
      {/* Upload overlay */}
      {status !== "ready" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#cfd3e0",
            fontSize: 14,
            background: status === "error" ? "rgba(200,0,0,0.1)" : "rgba(0,0,0,0.3)",
            borderRadius: 8,
          }}
        >
          {status === "loading" && "Loading STL…"}
          {status === "error" && (error || "Error loading model")}
          {(status === "idle" || (!src && !stlBuffer && !uploadedFile)) && showUpload && (
            <div style={{ textAlign: "center" }}>
              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={handleUploadClick}
                  style={{
                    padding: "16px 32px",
                    background: "rgba(255,255,255,0.15)",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderRadius: 12,
                    color: "#e7e9ef",
                    cursor: "pointer",
                    fontSize: 16,
                    fontWeight: 600,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  📁 Upload STL File
                </button>
              </div>
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                Upload an STL file to view on 3D plane
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Clear button when model is loaded */}
      {status === "ready" && uploadedFile && (
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <button
            onClick={clearUpload}
            style={{
              padding: "8px 16px",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 6,
              color: "#e7e9ef",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              backdropFilter: "blur(10px)",
            }}
          >
            ✕ Clear Model
          </button>
        </div>
      )}
      
      {/* Instructions */}
      {status === "ready" && (
        <div style={{ 
          position: "absolute", 
          bottom: 12, 
          left: 12, 
          padding: "8px 12px",
          background: "rgba(0,0,0,0.6)",
          borderRadius: 6,
          color: "#cfd3e0",
          fontSize: 12,
          backdropFilter: "blur(10px)",
        }}>
          Drag to orbit • Scroll to zoom • Right-drag to pan
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default STLPlaneViewer;
