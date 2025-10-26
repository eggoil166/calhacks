import React, { useState, useEffect } from 'react';
import { ARViewer } from '../components/ARViewer';

const ARViewerPage: React.FC = () => {
  const [stlUrl, setStlUrl] = useState<string>("");
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);

  // Check for generated STL data on component mount
  useEffect(() => {
    const generatedUrl = sessionStorage.getItem('generatedSTLUrl');
    const generatedBuffer = sessionStorage.getItem('generatedSTLBuffer');
    
    if (generatedUrl) {
      // Try to use the blob URL first
      setStlUrl(generatedUrl);
      console.log('Loaded generated STL URL for AR:', generatedUrl);
    }
    
    if (generatedBuffer) {
      try {
        const bufferArray = JSON.parse(generatedBuffer);
        const buffer = new Uint8Array(bufferArray).buffer;
        setStlBuffer(buffer);
        console.log('Loaded generated STL buffer for AR:', buffer.byteLength, 'bytes');
      } catch (error) {
        console.error('Failed to parse generated STL buffer:', error);
      }
    }
  }, []);

  const handleClose = () => {
    // Navigate back to home
    window.location.href = '/';
  };

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
      <ARViewer stlUrl={stlUrl} stlBuffer={stlBuffer || undefined} onClose={handleClose} />
    </div>
  );
};

export default ARViewerPage;
