import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Box, Download, RotateCcw, Upload } from "lucide-react";
import STLPlaneViewer from "../components/STLPlaneViewer";

const STLPlanePage: React.FC = () => {
  const [stlUrl, setStlUrl] = useState<string>("");
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);

  // Check for generated STL data on component mount
  useEffect(() => {
    const generatedUrl = sessionStorage.getItem('generatedSTLUrl');
    const generatedBuffer = sessionStorage.getItem('generatedSTLBuffer');
    
    if (generatedUrl) {
      setStlUrl(generatedUrl);
      console.log('Loaded generated STL URL:', generatedUrl);
    }
    
    if (generatedBuffer) {
      try {
        const bufferArray = JSON.parse(generatedBuffer);
        const buffer = new Uint8Array(bufferArray).buffer;
        setStlBuffer(buffer);
        console.log('Loaded generated STL buffer:', buffer.byteLength, 'bytes');
      } catch (error) {
        console.error('Failed to parse generated STL buffer:', error);
      }
    }
  }, []);

  const handleSTLLoaded = (geometry: THREE.BufferGeometry) => {
    console.log("STL loaded successfully:", geometry);
  };

  const handleReset = () => {
    setStlUrl("");
    setStlBuffer(null);
    sessionStorage.removeItem('generatedSTLUrl');
    sessionStorage.removeItem('generatedSTLBuffer');
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Tech Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[40rem] w-[40rem] rounded-full blur-3xl opacity-10"
          style={{
            background: "radial-gradient(closest-side, var(--accent-primary), var(--accent-secondary), transparent 60%)",
          }}
        />
        {/* Additional tech lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-20" />
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-20" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="sticky top-0 z-50 tech-glass"
          style={{ 
            background: 'var(--bg-glass)', 
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border-primary)'
          }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGoBack}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-200 tech-border"
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-secondary)'
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center tech-glow animate-pulse-glow"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    boxShadow: 'var(--shadow-glow)'
                  }}
                >
                  <Box className="h-5 w-5 text-white" />
                </div>
                <h1 
                  className="text-2xl font-bold"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  STL 3D Viewer
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                {stlUrl && (
                  <a
                    href={stlUrl}
                    download
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 tech-glow"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                      color: 'var(--text-primary)',
                      boxShadow: 'var(--shadow-glow)'
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Download STL
                  </a>
                )}
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 tech-border"
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-secondary)'
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>
              Interactive{' '}
              <span 
                style={{ 
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                3D Model Viewer
              </span>
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Explore your generated STL models with full 3D controls. Rotate, zoom, and examine every detail.
            </p>
          </motion.section>

          {/* Viewer Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-6xl mx-auto"
          >
            <div className="tech-glass rounded-3xl shadow-2xl overflow-hidden tech-border">
              {/* Viewer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b tech-border" style={{ background: 'var(--bg-card)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: '#ef4444' }} />
                    <div className="h-3 w-3 rounded-full" style={{ background: '#f59e0b' }} />
                    <div className="h-3 w-3 rounded-full" style={{ background: '#10b981' }} />
                  </div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {stlUrl ? "Generated STL Model" : "STL Viewer"}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <Box className="w-4 h-4" />
                  <span>3D Model Viewer</span>
                </div>
              </div>

              {/* Viewer Content */}
              <div className="p-6">
                <STLPlaneViewer
                  src={stlUrl}
                  stlBuffer={stlBuffer}
                  width={800}
                  height={600}
                  color="#10b981"
                  backgroundColor="#f8fafc"
                  showUpload={true}
                  onSTLLoaded={handleSTLLoaded}
                />
              </div>
            </div>
          </motion.div>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 max-w-4xl mx-auto"
          >
            <div className="tech-glass rounded-2xl p-6 tech-border">
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>How to use the viewer:</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(0, 212, 255, 0.1)' }}
                    >
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>1</span>
                    </div>
                    <div>
                      <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Mouse Controls</h4>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Left click + drag to rotate • Scroll to zoom • Right click + drag to pan</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(0, 212, 255, 0.1)' }}
                    >
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>2</span>
                    </div>
                    <div>
                      <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Upload Models</h4>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Click the upload button to load your own STL files</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(0, 212, 255, 0.1)' }}
                    >
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>3</span>
                    </div>
                    <div>
                      <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Generated Models</h4>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Models from the main page automatically load here</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(0, 212, 255, 0.1)' }}
                    >
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>4</span>
                    </div>
                    <div>
                      <h4 className="font-medium" style={{ color: 'var(--text-primary)' }}>Download</h4>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Use the download button to save your STL files</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default STLPlanePage;
