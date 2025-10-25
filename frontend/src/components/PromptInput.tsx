import { useEffect, useRef, useState } from 'react';
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
}

export function PromptInput({ onGenerate, isLoading }: PromptInputProps) {
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
    <form onSubmit={handleSubmit} className="w-full max-w-3xl">
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg">Describe your 3D part</h2>
        </div>

        <textarea
          id="prompt-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: L-bracket 80x80x5 mm, two 6 mm holes every 20 mm"
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isLoading}
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={startStopRecording}
            disabled={isLoading}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${isRecording ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
          >
            {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording ? 'Stop Recording' : 'Speak (Speech to Text)'}
          </button>

          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
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
          </button>
        </div>
      </div>
    </form>
  );
}
