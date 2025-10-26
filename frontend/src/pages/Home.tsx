import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Eye, AlertCircle, Glasses, Box, Sparkles } from 'lucide-react';
import { PromptInput } from '../components/PromptInput';
import { ParamPanel } from '../components/ParamPanel';
import ModelViewer from '../components/ModelViewer';
import { SpeechLoadingOverlay } from '../components/SpeechLoadingOverlay';
import { nlpToCAD, cadToMesh, xcallClaudeFlash, textToSpeech } from '../lib/api';
import { callClaudeFlash } from '../lib/apicalls';
import { useDebounce } from '../hooks/useDebounce';
import type { CADParameter } from '../lib/types';

export function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [modelId, setModelId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [units, setUnits] = useState('mm');
  const [parameters, setParameters] = useState<CADParameter[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});
  const [stlUrl, setStlUrl] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const debouncedParams = useDebounce(paramValues, 400);

  const playAudio = async (text: string) => {
    try {
      console.log('Generating audio for:', text);
      setIsPlayingAudio(true);
      const audioBlob = await textToSpeech(text);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlayingAudio(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } catch (err) {
      console.error('Failed to play audio:', err);
      setIsPlayingAudio(false);
      // Don't block the UI if audio fails
    }
  };

  const handleGenerate = async (prompt: string) => {
    setError(null);
    setIsGenerating(true);

    try {
      // Call the LLM API to generate SCAD and description
      const llmResponse = await xcallClaudeFlash(prompt);
      
      // If there's a description from the LLM, generate and play audio
      if (llmResponse.description && llmResponse.description.trim()) {
        console.log('LLM returned description:', llmResponse.description);
        // Play audio in the background (don't wait for it)
        playAudio(llmResponse.description).catch(err => 
          console.error('Audio playback failed:', err)
        );
      }
      
      // ALSO call the Claude Flash endpoint to get GLB file
      const context = 'Units: mm. Output a 3D model as STL.';
      const result = await callClaudeFlash(prompt, context);
      
      console.log('✅ STL file received:', result.fileName);
      
      // Convert STL buffer to URL for loading into viewer
      const blob = new Blob([result.stlBuffer], { type: 'model/stl' });
      const url = URL.createObjectURL(blob);
      
      // Set the STL URL to load it in the viewer
      setStlUrl(url);
      
      // Store STL data for STL Plane Viewer
      sessionStorage.setItem('generatedSTLUrl', url);
      sessionStorage.setItem('generatedSTLBuffer', JSON.stringify(Array.from(new Uint8Array(result.stlBuffer))));
      
      // Continue with existing mock flow for parameters
      const cadResult = await nlpToCAD(prompt);

      setModelId(cadResult.modelId);
      setTitle(cadResult.title);
      setUnits(cadResult.units);
      setParameters(cadResult.parameters);
      setParamValues(cadResult.parameters.reduce((acc, param) => {
        acc[param.name] = param.default;
        return acc;
      }, {} as Record<string, number>));
      setWarnings([]);
    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = useCallback(async () => {
    if (!modelId) return;
    setIsRegenerating(true);
    try {
      const result = await cadToMesh(modelId, paramValues);
      setStlUrl(result.stlUrl);
    } catch (err) {
      console.error('Regeneration failed:', err);
      setError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      setIsRegenerating(false);
    }
  }, [modelId, paramValues]);

  const handleSeeInAR = () => {
    if (stlUrl) {
      window.location.href = '/ar-viewer';
    }
  };

  // Load STL from session storage on mount
  useEffect(() => {
    const generatedUrl = sessionStorage.getItem('generatedSTLUrl');
    if (generatedUrl && !stlUrl) {
      setStlUrl(generatedUrl);
    }
  }, [stlUrl]);

  // Mock CAD generation for parameters when stlUrl changes
  useEffect(() => {
    if (stlUrl && stlUrl.startsWith('blob:')) {
      // Only update if we don't already have parameters from a real generation
      if (parameters.length === 0) {
        const mockResult = {
          modelId: 'mock-model',
          title: 'Generated Model',
          units: 'mm',
          parameters: [
            { name: 'width', label: 'Width', unit: 'mm', type: 'number' as const, default: 50, min: 10, max: 100, step: 1 },
            { name: 'height', label: 'Height', unit: 'mm', type: 'number' as const, default: 30, min: 10, max: 80, step: 1 },
            { name: 'thickness', label: 'Thickness', unit: 'mm', type: 'number' as const, default: 5, min: 1, max: 20, step: 0.5 }
          ],
          warnings: []
        };
        setModelId(mockResult.modelId);
        setTitle(mockResult.title);
        setUnits(mockResult.units);
        setParameters(mockResult.parameters);
        setParamValues(mockResult.parameters.reduce((acc, param) => {
          acc[param.name] = param.default;
          return acc;
        }, {} as Record<string, number>));
        setWarnings(mockResult.warnings);
      }
    }
  }, [stlUrl, parameters.length]);

  // Regenerate when parameters change
  useEffect(() => {
    if (modelId && Object.keys(debouncedParams).length > 0) {
      handleRegenerate();
    }
  }, [debouncedParams, modelId, handleRegenerate]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Speech Loading Overlay */}
      <SpeechLoadingOverlay 
        isVisible={isPlayingAudio} 
        text={isGenerating ? "Generating..." : "Vision Forge"} 
        statusText={isPlayingAudio ? "Playing audio..." : "Loading Vision Forge..."}
      />
      
      {/* Tech Background Effects */}
      <div className="pointer-events-none fixed inset-0">
        {/* Main glow effect */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[40rem] w-[40rem] rounded-full blur-3xl opacity-10"
          style={{
            background: "radial-gradient(closest-side, var(--accent-primary), var(--accent-secondary), transparent 60%)",
          }}
        />
        
        {/* Animated tech lines */}
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-20 animate-data-flow" />
        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-var(--accent-secondary) to-transparent opacity-20 animate-data-flow" style={{ animationDelay: '1.5s' }} />
        
        {/* Vertical scan lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-var(--accent-primary) to-transparent opacity-10 animate-scan-line" />
        <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-var(--accent-secondary) to-transparent opacity-10 animate-scan-line" style={{ animationDelay: '2s' }} />
        
        {/* Diagonal tech lines */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-15 transform rotate-12 animate-data-flow" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-var(--accent-secondary) to-transparent opacity-15 transform -rotate-12 animate-data-flow" style={{ animationDelay: '2.5s' }} />
        </div>
        
        {/* Floating particles */}
        <div className="tech-particles" />
        
        {/* Circuit patterns */}
        <div className="tech-circuit" />
        
        {/* Corner tech elements */}
        <div className="absolute top-4 left-4 w-16 h-16 border-l-2 border-t-2 border-var(--accent-primary) opacity-30" />
        <div className="absolute top-4 right-4 w-16 h-16 border-r-2 border-t-2 border-var(--accent-primary) opacity-30" />
        <div className="absolute bottom-4 left-4 w-16 h-16 border-l-2 border-b-2 border-var(--accent-primary) opacity-30" />
        <div className="absolute bottom-4 right-4 w-16 h-16 border-r-2 border-b-2 border-var(--accent-primary) opacity-30" />
        
        {/* Data streams */}
        <div className="absolute top-1/2 left-0 w-2 h-2 bg-var(--accent-primary) rounded-full animate-data-flow opacity-60" />
        <div className="absolute top-1/3 right-0 w-2 h-2 bg-var(--accent-secondary) rounded-full animate-data-flow opacity-60" style={{ animationDelay: '1s' }} />
        <div className="absolute top-2/3 left-0 w-2 h-2 bg-var(--accent-primary) rounded-full animate-data-flow opacity-60" style={{ animationDelay: '2s' }} />
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
            borderBottom: '1px solid var(--border-primary)',
            position: 'relative'
          }}
        >
          {/* Header tech lines */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-50" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-var(--accent-secondary) to-transparent opacity-30" />
          
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center tech-glow animate-pulse-glow relative"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    boxShadow: 'var(--shadow-glow)'
                  }}
                >
                  {/* Inner tech pattern */}
                  <div className="absolute inset-1 border border-white opacity-20 rounded" />
                  <Sparkles className="h-5 w-5 text-white relative z-10" />
                </div>
                <h1 
                  className="text-2xl font-bold relative"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Vision Forge
                  {/* Text glow effect */}
                  <div className="absolute inset-0 text-shadow-lg" style={{ 
                    textShadow: '0 0 20px var(--accent-primary)',
                    opacity: 0.3
                  }}>Vision Forge</div>
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <a
                  href="/ar-viewer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 tech-glow relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-glow)'
                  }}
                >
                  {/* Button tech effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-data-flow" />
                  <Glasses className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">AR Viewer</span>
                </a>
                <a
                  href="/stl-plane"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 tech-border relative overflow-hidden"
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-secondary)'
                  }}
                >
                  {/* Subtle tech effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-5 animate-data-flow" />
                  <Box className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">STL Viewer</span>
                </a>
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
            className="text-center mb-12 relative"
          >
            {/* Hero tech elements */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-30" />
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-2xl h-px bg-gradient-to-r from-transparent via-var(--accent-secondary) to-transparent opacity-20" />
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 relative" style={{ color: 'var(--text-primary)' }}>
              Advanced{' '}
              <span 
                className="relative"
                style={{ 
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                CAD Workbench
                {/* Text tech effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-20 animate-data-flow" />
              </span>
            </h2>
            <p className="text-xl max-w-3xl mx-auto relative" style={{ color: 'var(--text-secondary)' }}>
              Generate CAD models from natural language, customize parameters, and view them in augmented reality
              {/* Subtle tech underline */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-40" />
            </p>
          </motion.section>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 max-w-3xl mx-auto rounded-2xl p-6 flex items-start gap-4 tech-border"
              style={{ 
                background: 'rgba(220, 38, 38, 0.1)', 
                border: '1px solid rgba(220, 38, 38, 0.3)' 
              }}
            >
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
              <div className="flex-1">
                <h3 className="font-semibold mb-1" style={{ color: '#fca5a5' }}>System Error</h3>
                <p style={{ color: '#f87171' }}>{error}</p>
              </div>
            </motion.div>
          )}

          {/* Warnings Display */}
          {warnings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-8 max-w-3xl mx-auto rounded-2xl p-6 flex items-start gap-4 tech-border"
              style={{ 
                background: 'rgba(245, 158, 11, 0.1)', 
                border: '1px solid rgba(245, 158, 11, 0.3)' 
              }}
            >
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <div className="flex-1">
                <h3 className="font-semibold mb-2" style={{ color: '#fbbf24' }}>System Warnings</h3>
                <ul className="space-y-1" style={{ color: '#fcd34d' }}>
                  {warnings.map((warning, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#f59e0b' }} />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8 relative"
          >
            {/* Section tech lines */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-20" />
            <PromptInput onGenerate={handleGenerate} isLoading={isGenerating} />
          </motion.div>

          {/* Parameters Panel */}
          {parameters.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-8 relative"
            >
              {/* Section tech lines */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-var(--accent-secondary) to-transparent opacity-20" />
              <ParamPanel
                parameters={parameters}
                title={title}
                units={units}
                onParametersChange={setParamValues}
                isRegenerating={isRegenerating}
              />
            </motion.div>
          )}

          {/* Model Viewer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-8 relative"
          >
            {/* Section tech lines */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-var(--accent-primary) to-transparent opacity-20" />
            <ModelViewer 
              src={stlUrl} 
              title={stlUrl ? "Generated STL Model" : "Upload STL File"} 
              showUpload={!stlUrl}
            />
          </motion.div>

          {/* Action Buttons */}
          {stlUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <button
                onClick={handleSeeInAR}
                disabled={!stlUrl || isRegenerating}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold transition-all duration-200 shadow-lg shadow-blue-600/20"
              >
                <Eye className="w-5 h-5" />
                View in AR
              </button>
              <a
                href={stlUrl}
                download
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-semibold transition-all duration-200 shadow-lg border border-gray-200"
              >
                <Download className="w-5 h-5" />
                Download STL
              </a>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
