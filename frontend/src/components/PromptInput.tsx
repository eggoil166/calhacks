import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Mic, Square } from 'lucide-react';

// Minimal Web Speech typings (avoid 'any' while not depending on DOM lib types)
type RecognitionEvent = {
  resultIndex: number;
  results: { length: number; [index: number]: { 0: { transcript: string }; isFinal?: boolean } };
};
type WebSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  onresult?: (ev: RecognitionEvent) => void;
  onend?: () => void;
  onstart?: () => void;
};
type SRConstructor = new () => WebSpeechRecognition;

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  externalPrompt?: string;
  onPromptChange?: (prompt: string) => void;
}

export function PromptInput({ onGenerate, isLoading, externalPrompt, onPromptChange }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const basePromptRef = useRef<string>('');
  const finalTextRef = useRef<string>('');
  const debounceTimerRef = useRef<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  // Handle external prompt changes
  useEffect(() => {
    if (externalPrompt !== undefined && externalPrompt !== prompt) {
      setPrompt(externalPrompt);
    }
  }, [externalPrompt, prompt]);

  // Handle prompt changes
  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (onPromptChange) {
      onPromptChange(value);
    }
  };

  useEffect(() => {
    const SRCtor = ((window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor; }).SpeechRecognition
      ?? (window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor; }).webkitSpeechRecognition);
    if (!SRCtor) return;
    const rec: WebSpeechRecognition = new SRCtor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true; // keep listening for longer phrases/sentences
    rec.maxAlternatives = 1;
    rec.onresult = (ev: RecognitionEvent) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const text = (res[0]?.transcript || '').trim();
        if (res.isFinal) {
          finalTextRef.current += (text + ' ');
        } else {
          interim = text;
        }
      }
      const combined = [basePromptRef.current, finalTextRef.current, interim]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => {
        setPrompt(combined);
      }, 120);
    };
    rec.onend = () => {
      // Keep listening if user hasn't pressed Stop
      if (isRecordingRef.current) {
        try { recognitionRef.current?.start(); } catch {
          // ignore restart errors
        }
      } else {
        setIsRecording(false);
      }
    };
    // reflect isRecording on start
    rec.onstart = () => {
      setIsRecording(true);
      isRecordingRef.current = true;
      finalTextRef.current = '';
      basePromptRef.current = (document.getElementById('prompt-textarea') as HTMLTextAreaElement | null)?.value || '';
    };
    recognitionRef.current = rec;
    return () => {
      try { recognitionRef.current?.stop(); } catch (e) { console.warn('SR stop failed', e); }
      recognitionRef.current = null;
    };
  }, [onGenerate, prompt]);

  const startStopRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser');
      return;
    }
    if (isRecording) {
      isRecordingRef.current = false;
      try { recognitionRef.current?.stop(); } catch (e) { console.warn('SR stop failed', e); }
      setIsRecording(false);
    } else {
      try {
        isRecordingRef.current = true;
        recognitionRef.current?.start();
      } catch (e) {
        console.warn('SR start failed', e);
        return;
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-4xl mx-auto"
    >
      <form onSubmit={handleSubmit} className="w-full">
        <div className="tech-glass rounded-3xl shadow-2xl p-8 space-y-6 tech-border">
          <div className="flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div 
              className="h-10 w-10 rounded-xl flex items-center justify-center tech-glow animate-pulse-glow"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Describe your 3D part</h2>
          </div>

          <div className="relative">
            <textarea
              id="prompt-textarea"
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Example: L-bracket 80x80x5 mm, two 6 mm holes every 20 mm"
              className="w-full h-40 px-6 py-4 rounded-2xl resize-none text-lg transition-all duration-200 tech-border"
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-secondary)',
                outline: 'none'
              }}
              disabled={isLoading}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent-primary)';
                e.target.style.boxShadow = 'var(--shadow-glow)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-secondary)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2" style={{ color: '#ef4444' }}>
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Recording...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <motion.button
              type="button"
              onClick={startStopRecording}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                isRecording ? 'tech-glow' : 'tech-border'
              }`}
              style={{
                background: isRecording ? 'rgba(220, 38, 38, 0.1)' : 'var(--bg-card)',
                color: isRecording ? '#ef4444' : 'var(--text-secondary)',
                border: isRecording ? '1px solid rgba(220, 38, 38, 0.3)' : '1px solid var(--border-secondary)'
              }}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isRecording ? 'Stop Recording' : 'Speak (Speech to Text)'}
            </motion.button>

            <motion.button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className="font-semibold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 tech-glow disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate CAD Model
                </>
              )}
            </motion.button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
