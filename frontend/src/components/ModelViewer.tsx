import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

type Props = {
  /** URL of the STL file */
  src?: string;
  /** STL file buffer for direct upload */
  stlBuffer?: ArrayBuffer;
  /** Card title (optional) */
  title?: string;
  /** Fixed height of the viewport area (px). Default 360 */
  height?: number;
  /** Mesh color */
  color?: string;
  /** Card background */
  bg?: string;
  /** Show upload button when no src provided */
  showUpload?: boolean;
  /** Hide card styling (no borders, background, title) */
  hideCard?: boolean;
};

const STLCard: React.FC<Props> = ({
  src,
  stlBuffer,
  title = "Preview",
  height = 360,
  color = "#c9d2ff",
  bg = "#0b0e14",
  showUpload = true,
  hideCard = false,
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

  // Card styles
  const cardStyle: React.CSSProperties = hideCard ? {
    background: "transparent",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    color: "var(--text-primary)",
    overflow: "hidden",
    maxWidth: "none",
    width: "100%",
    margin: 0,
    padding: 0,
  } : {
    borderRadius: 0,
    boxShadow: "none",
    background: "var(--bg-glass)",
    backdropFilter: "blur(20px)",
    color: "var(--text-primary)",
    overflow: "hidden",
    border: "1px solid var(--border-primary)",
    maxWidth: "800px",
    width: "100%",
    margin: "0 auto",
  };
  const headerStyle: React.CSSProperties = {
    padding: "16px 24px",
    borderBottom: "1px solid var(--border-secondary)",
    fontWeight: 600,
    fontSize: 16,
    letterSpacing: 0.25,
    background: "var(--bg-card)",
    color: "var(--text-primary)",
  };
  const canvasWrapStyle: React.CSSProperties = {
    position: "relative",
    height,
    background: "var(--bg-secondary)",
    width: "100%",
  };
  const badgeStyle: React.CSSProperties = {
    position: "absolute",
    top: 16,
    left: 16,
    padding: "6px 12px",
    borderRadius: 20,
    fontSize: 12,
    background: "rgba(0, 212, 255, 0.1)",
    backdropFilter: "blur(6px)",
    color: "var(--accent-primary)",
    fontWeight: 500,
    border: "1px solid var(--border-primary)",
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene / Renderer
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    // Add visible grid background when hideCard is true
    if (hideCard) {
      const gridHelper = new THREE.GridHelper(1000, 30, 0x00d4ff, 0x00d4ff);
      gridHelper.material.opacity = 0.4;
      gridHelper.material.transparent = true;
      scene.add(gridHelper);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
    camera.position.set(3, 3, 3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 1.0);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(3, 6, 8);
    dir.castShadow = true;
    scene.add(hemi, dir);

    // Ground shadow catcher - more visible when hideCard is true
    const groundMat = new THREE.ShadowMaterial({ 
      opacity: hideCard ? 0.4 : 0.25 
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(2.5, 64), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Mount
    mountRef.current.appendChild(renderer.domElement);

    // Resize handling (guard against zero height)
    const resize = () => {
      if (!mountRef.current) return;
      const el = mountRef.current;
      const w = el.clientWidth || 1;
      let h = el.clientHeight || height;
      if (h < 1) h = height;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    // Size once before first render
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(mountRef.current);

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
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat?.dispose();
        }
      });
    };
  }, [height, bg, hideCard]);

  // Fit object to view: centers by box center and fits both width & height
  const frameObject = (object: THREE.Object3D) => {
    const camera = cameraRef.current!;
    const controls = controlsRef.current!;

    // Ensure world matrices are current for accurate Box3
    object.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Target controls & lookAt the true center
    controls.target.copy(center);
    controls.update();

    // Compute distance that fits both height and width
    const padding = 1.2; // 20% margin
    const fovY = THREE.MathUtils.degToRad(camera.fov);
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * camera.aspect);

    const distH = (size.y * padding) / (2 * Math.tan(fovY / 2));
    const distW = (size.x * padding) / (2 * Math.tan(fovX / 2));
    const dist = Math.max(distH, distW, size.z * 1.5);

    // 3/4 view from above
    const az = Math.PI / 4;
    const el = Math.PI / 5;
    const offset = new THREE.Vector3(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az)
    ).multiplyScalar(dist);

    camera.position.copy(center).add(offset);
    camera.near = Math.max(dist / 1000, 0.01);
    camera.far = dist * 100;
    camera.updateProjectionMatrix();
    camera.lookAt(center);

    // Controls bounds so user zoom doesn't immediately clip
    controls.minDistance = dist * 0.2;
    controls.maxDistance = dist * 5;
    controls.update();
  };

  // Load STL whenever inputs change
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    // No STL available
    if (!src && !stlBuffer && !uploadedFile) {
      setStatus("idle");
      return;
    }

    const scene = sceneRef.current!;
    const loader = new STLLoader();

    // Remove previous mesh if any
    const old = scene.getObjectByName("stl-root");
    if (old) {
      scene.remove(old);
      // dispose old resources
      old.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat?.dispose();
        }
      });
    }

    const load = async () => {
      try {
        setStatus("loading");
        setError(null);

        let geometry: THREE.BufferGeometry;
        if (stlBuffer) {
          geometry = loader.parse(stlBuffer);
        } else if (uploadedFile) {
          const ab = await uploadedFile.arrayBuffer();
          geometry = loader.parse(ab);
        } else if (src) {
          geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) =>
            loader.load(src, resolve, undefined, reject)
          );
        } else {
          throw new Error("No STL data provided");
        }

        geometry.computeVertexNormals();
        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.15,
          roughness: 0.6,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = "stl-root";
        mesh.castShadow = true;
        mesh.receiveShadow = false;

        scene.add(mesh);

        // Ensure added before framing
        mesh.updateWorldMatrix(true, true);
        frameObject(mesh);

        setStatus("ready");
      } catch (e) {
        console.error("STL load error:", e);
        setError("Failed to load STL. Check the file format and try again.");
        setStatus("error");
      }
    };

    load();
  }, [src, stlBuffer, uploadedFile, color, height]);

  // File upload handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".stl")) {
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
      fileInputRef.current.value = "";
    }
  };

  return (
    <div style={cardStyle}>
      {!hideCard && (
        <div style={headerStyle}>
          {title}
          {uploadedFile && (
            <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 8 }}>
              ({uploadedFile.name})
            </span>
          )}
        </div>
      )}

      <div ref={mountRef} style={canvasWrapStyle}>
        {status !== "ready" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "#6b7280",
              fontSize: 14,
              background: "rgba(248, 250, 252, 0.8)",
              backdropFilter: "blur(4px)",
            }}
          >
            {status === "loading" && "Loading STL…"}
            {status === "error" && (error || "Error loading model")}
            {(status === "idle" || (!src && !stlBuffer && !uploadedFile)) &&
              showUpload && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ marginBottom: 16 }}>
                    <button
                      onClick={handleUploadClick}
                      style={{
                        padding: "12px 24px",
                        background: "rgba(0, 212, 255, 0.1)",
                        border: "1px solid var(--border-primary)",
                        borderRadius: 12,
                        color: "var(--accent-primary)",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0, 212, 255, 0.2)";
                        e.currentTarget.style.boxShadow = "var(--shadow-glow)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(0, 212, 255, 0.1)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      📁 Upload STL File
                    </button>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Upload or Generate a model above
                  </div>
                </div>
              )}
          </div>
        )}

        {status === "ready" && uploadedFile && (
          <div style={{ position: "absolute", top: 16, right: 16 }}>
            <button
              onClick={clearUpload}
              style={{
                padding: "6px 12px",
                background: "rgba(220, 38, 38, 0.1)",
                border: "1px solid rgba(220, 38, 38, 0.3)",
                borderRadius: 8,
                color: "#ef4444",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(220, 38, 38, 0.2)";
                e.currentTarget.style.boxShadow = "0 0 10px rgba(220, 38, 38, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              ✕ Clear
            </button>
          </div>
        )}

        {!hideCard && <div style={badgeStyle}>Orbit: drag • Zoom: wheel</div>}
      </div>

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

export default STLCard;
