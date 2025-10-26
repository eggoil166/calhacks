import React, { useState } from "react";
import STLPlaneViewer from "../components/STLPlaneViewer";

const STLPlanePage: React.FC = () => {
  const [stlUrl, setStlUrl] = useState<string>("");
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);

  const handleSTLLoaded = (geometry: THREE.BufferGeometry) => {
    console.log("STL loaded successfully:", geometry);
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
      padding: "20px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ 
          textAlign: "center", 
          marginBottom: "30px",
          color: "#e7e9ef"
        }}>
          <h1 style={{ 
            fontSize: "2.5rem", 
            fontWeight: "700", 
            margin: "0 0 10px 0",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            STL 3D Plane Viewer
          </h1>
          <p style={{ 
            fontSize: "1.1rem", 
            opacity: 0.8, 
            margin: 0,
            color: "#cfd3e0"
          }}>
            Upload and view STL models on a 3D plane with full controls
          </p>
        </div>

        {/* Main Viewer */}
        <div style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)"
        }}>
          <STLPlaneViewer
            src={stlUrl}
            stlBuffer={stlBuffer}
            width={800}
            height={600}
            color="#667eea"
            backgroundColor="#0b0e14"
            showUpload={true}
            onSTLLoaded={handleSTLLoaded}
          />
        </div>

        {/* Controls */}
        <div style={{ 
          marginTop: "20px", 
          display: "flex", 
          gap: "15px", 
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: "12px 24px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "#e7e9ef",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            }}
          >
            ← Back to Home
          </button>
          
          <button
            onClick={() => {
              setStlUrl("");
              setStlBuffer(null);
            }}
            style={{
              padding: "12px 24px",
              background: "rgba(255,100,100,0.2)",
              border: "1px solid rgba(255,100,100,0.3)",
              borderRadius: "8px",
              color: "#ff6b6b",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255,100,100,0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255,100,100,0.2)";
            }}
          >
            🔄 Reset Viewer
          </button>
        </div>

        {/* Info */}
        <div style={{ 
          marginTop: "30px", 
          textAlign: "center",
          color: "#cfd3e0",
          fontSize: "14px",
          opacity: 0.7
        }}>
          <p>This viewer uses the same STL loading logic as the card viewer, but displays models on a 3D plane with grid reference.</p>
          <p>Perfect for examining STL files in a 3D environment with full orbit controls.</p>
        </div>
      </div>
    </div>
  );
};

export default STLPlanePage;


