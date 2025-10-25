import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

export function Fallback() {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const glbUrl = params.get('glb');
    const usdzUrl = params.get('usdz');

    if (!glbUrl || !viewerRef.current) return;

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

  const params = new URLSearchParams(window.location.search);
  const glbUrl = params.get('glb') || '';
  const usdzUrl = params.get('usdz') || '';

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">View in AR</h1>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div ref={viewerRef} className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden">
          <model-viewer
            src={glbUrl}
            ios-src={usdzUrl}
            ar
            ar-modes="scene-viewer quick-look webxr"
            camera-controls
            auto-rotate
            shadow-intensity="1"
            alt="3D CAD Model"
            style={{ width: '100%', height: '600px' }}
          >
            <button
              slot="ar-button"
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-lg transition-colors"
            >
              View in AR
            </button>
          </model-viewer>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-6 text-center text-sm text-gray-600">
        <p>On iOS: Tap "View in AR" to launch Quick Look</p>
        <p>On Android: Tap "View in AR" to launch Scene Viewer</p>
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
