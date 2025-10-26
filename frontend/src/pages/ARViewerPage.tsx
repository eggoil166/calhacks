import React, { useState, useEffect } from 'react';
import { ARViewer } from '../components/ARViewer';

const ARViewerPage: React.FC = () => {
  const [stlUrl, setStlUrl] = useState<string>("");

  // Check for generated STL data on component mount
  useEffect(() => {
    const generatedUrl = sessionStorage.getItem('generatedSTLUrl');
    
    if (generatedUrl) {
      setStlUrl(generatedUrl);
      console.log('Loaded generated STL URL for AR:', generatedUrl);
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
      background: 'black'
    }}>
      <ARViewer stlUrl={stlUrl} onClose={handleClose} />
    </div>
  );
};

export default ARViewerPage;
