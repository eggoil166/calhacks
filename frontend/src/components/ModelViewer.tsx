import { useEffect, useRef } from 'react';
import { Box } from 'lucide-react';

interface ModelViewerProps {
  glbUrl: string;
  usdzUrl: string;
}

export function ModelViewer({ glbUrl, usdzUrl }: ModelViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewerRef.current || !glbUrl) return;

    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  if (!glbUrl) {
    return (
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-12 flex flex-col items-center justify-center text-gray-400">
        <Box className="w-16 h-16 mb-4" />
        <p className="text-lg">No model generated yet</p>
        <p className="text-sm">Enter a description and click Generate</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg overflow-hidden">
      <div ref={viewerRef} className="w-full h-96">
        <model-viewer
          src={glbUrl}
          ios-src={usdzUrl}
          alt="Generated 3D CAD Model"
          auto-rotate
          camera-controls
          shadow-intensity="1"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}
