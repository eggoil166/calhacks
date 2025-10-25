import { useState, useEffect } from 'react';
import { Download, Eye, AlertCircle } from 'lucide-react';
import { PromptInput } from '../components/PromptInput';
import { ParamPanel } from '../components/ParamPanel';
import { ModelViewer } from '../components/ModelViewer';
import { ARViewer } from '../components/ARViewer';
import { nlpToCAD, cadToMesh } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import type { CADParameter } from '../lib/types';

export function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showAR, setShowAR] = useState(false);
  // removed auto-AR preference; AR only opens when user clicks
  const [error, setError] = useState<string | null>(null);

  const [modelId, setModelId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [units, setUnits] = useState('mm');
  const [parameters, setParameters] = useState<CADParameter[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});
  const [glbUrl, setGlbUrl] = useState('');
  const [usdzUrl, setUsdzUrl] = useState('');
  const [stlUrl, setStlUrl] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const debouncedParams = useDebounce(paramValues, 400);

  const handleGenerate = async (prompt: string) => {
    setError(null);
    setIsGenerating(true);

    try {
      const result = await nlpToCAD(prompt);

      setModelId(result.modelId);
      setTitle(result.title);
      setUnits(result.units);
      setParameters(result.parameters);

      const defaultParams: Record<string, number> = {};
      result.parameters.forEach(param => {
        defaultParams[param.name] = param.default;
      });
      setParamValues(defaultParams);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate CAD model');
      console.error(err);
    } finally {
      setIsGenerating(false);
      // Do NOT auto-open AR; user will press See in AR when ready
    }
  };

  useEffect(() => {
    if (!modelId || Object.keys(debouncedParams).length === 0) return;

    const regenerate = async () => {
      setIsRegenerating(true);
      setError(null);

      try {
        const result = await cadToMesh(modelId, debouncedParams);

        setGlbUrl(result.glbUrl);
        setUsdzUrl(result.usdzUrl);
        setStlUrl(result.stlUrl);
        setWarnings(result.meta.warnings || []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to regenerate mesh');
        console.error(err);
      } finally {
        setIsRegenerating(false);
      }
    };

    regenerate();
  }, [modelId, debouncedParams]);

  const handleSeeInAR = async () => {
    setShowAR(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">AR CAD</h1>
          <p className="text-gray-600">Describe any 3D part and edit in real space</p>
        </header>

        {error && (
          <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="max-w-3xl mx-auto bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-yellow-800 font-medium">Warnings</p>
              <ul className="text-yellow-700 text-sm list-disc list-inside">
                {warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center space-y-8">
          <PromptInput onGenerate={handleGenerate} isLoading={isGenerating} />

          {parameters.length > 0 && (
            <ParamPanel
              parameters={parameters}
              title={title}
              units={units}
              onParametersChange={setParamValues}
              isRegenerating={isRegenerating}
            />
          )}

          {glbUrl && (
            <>
              <ModelViewer glbUrl={glbUrl} usdzUrl={usdzUrl} />
              <div className="fixed bottom-4 left-0 right-0 z-50 flex items-center justify-center gap-4">
                <button
                  onClick={handleSeeInAR}
                  disabled={!glbUrl || isRegenerating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-lg"
                >
                  <Eye className="w-5 h-5" />
                  See in AR
                </button>
                {stlUrl && (
                  <a
                    href={stlUrl}
                    download
                    className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center gap-2 shadow-lg border border-gray-300"
                  >
                    <Download className="w-5 h-5" />
                    Download STL
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showAR && glbUrl && (
        <ARViewer glbUrl={glbUrl} onClose={() => setShowAR(false)} />
      )}
    </div>
  );
}


