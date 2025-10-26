import React, { useEffect, useRef, useState, useCallback } from 'react';

interface VoiceOrbProps {
  onTranscript?: (text: string) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  className?: string;
}

interface OrbParticle {
  angle: number;
  radius: number;
  size: number;
  speed: number;
  offset: number;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  onTranscript,
  onAudioStart,
  onAudioEnd,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number | null>(null);
  
  // Orb animation properties
  const particlesRef = useRef<OrbParticle[]>([]);
  const centerXRef = useRef<number>(0);
  const centerYRef = useRef<number>(0);
  const baseRadiusRef = useRef<number>(80);
  const currentRadiusRef = useRef<number>(80);
  const targetRadiusRef = useRef<number>(80);
  const timeRef = useRef<number>(0);
  
  // Speech recognition
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [statusText, setStatusText] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const initParticles = useCallback(() => {
    const particleCount = 120;
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      particlesRef.current.push({
        angle,
        radius: baseRadiusRef.current + Math.random() * 20,
        size: 1 + Math.random() * 2,
        speed: 0.001 + Math.random() * 0.002,
        offset: Math.random() * Math.PI * 2,
      });
    }
  }, []);

  const setupSpeechRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.warn('Speech recognition not supported');
      setStatusText('Speech recognition not available');
      return;
    }
    
    recognitionRef.current = new SpeechRecognitionAPI();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 1;
    
    recognitionRef.current.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setIsProcessing(false);
      targetRadiusRef.current = 120;
      setLastTranscript('');
      setStatusText('Listening...');
    };
    
    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim();
      
      console.log('Speech result:', { transcript, isFinal: lastResult.isFinal });
      
      setLastTranscript(transcript);
      setStatusText(`"${transcript}"`);
      
      if (lastResult.isFinal && transcript.length > 0) {
        console.log('Final result detected, processing...');
        stopListening();
        handleFinalTranscript(transcript);
      }
    };
    
    recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      targetRadiusRef.current = baseRadiusRef.current;
      setStatusText('');
      
      if (event.error === 'not-allowed') {
        setStatusText('Microphone denied');
      } else if (event.error === 'no-speech') {
        setStatusText('No speech detected');
      } else {
        setStatusText('Try speaking again');
      }
    };
    
    recognitionRef.current.onend = () => {
      console.log('Speech recognition ended', { lastTranscript, isProcessing });
      setIsListening(false);
      targetRadiusRef.current = baseRadiusRef.current;
      
      if (lastTranscript.length > 0 && !isProcessing) {
        console.log('Processing transcript from onend');
        handleFinalTranscript(lastTranscript);
      }
    };
  }, [lastTranscript, isProcessing]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setStatusText('Failed to start listening');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  }, []);

  const handleFinalTranscript = useCallback(async (transcript: string) => {
    if (isProcessing || transcript.length === 0) {
      return;
    }
    
    setIsProcessing(true);
    setLastTranscript('');
    setStatusText(`Transcribed: "${transcript}"`);
    
    // Call the transcript callback if provided
    if (onTranscript) {
      onTranscript(transcript);
    }
    
    // Reset processing flag after a delay
    setTimeout(() => {
      setIsProcessing(false);
      setStatusText('');
    }, 2000);
  }, [isProcessing, onTranscript]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    timeRef.current += 0.016; // ~60fps
    
    // Smooth radius transition
    currentRadiusRef.current += (targetRadiusRef.current - currentRadiusRef.current) * 0.1;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw glow
    const gradient = ctx.createRadialGradient(
      centerXRef.current, centerYRef.current, currentRadiusRef.current * 0.5,
      centerXRef.current, centerYRef.current, currentRadiusRef.current * 1.5
    );
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0.2)');
    gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw particles
    particlesRef.current.forEach((particle, index) => {
      // Update particle angle
      particle.angle += particle.speed;
      
      // Calculate position with wave effect
      const wave = Math.sin(timeRef.current * 2 + particle.offset) * 10;
      const radius = currentRadiusRef.current + wave;
      const x = centerXRef.current + Math.cos(particle.angle) * radius;
      const y = centerYRef.current + Math.sin(particle.angle) * radius;
      
      // Particle color (cyan with varying opacity)
      const opacity = (isListening || isPlayingAudio)
        ? 0.6 + Math.sin(timeRef.current * 3 + index * 0.1) * 0.4
        : 0.4 + Math.sin(timeRef.current + index * 0.1) * 0.2;
      
      ctx.fillStyle = `rgba(0, 212, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw center core
    const coreGradient = ctx.createRadialGradient(
      centerXRef.current, centerYRef.current, 0,
      centerXRef.current, centerYRef.current, currentRadiusRef.current * 0.6
    );
    coreGradient.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
    coreGradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.4)');
    coreGradient.addColorStop(1, 'rgba(0, 212, 255, 0)');
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(centerXRef.current, centerYRef.current, currentRadiusRef.current * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    animationIdRef.current = requestAnimationFrame(animate);
  }, [isListening, isPlayingAudio]);

  const handleCanvasClick = useCallback(() => {
    if (!recognitionRef.current) {
      setStatusText('Speech recognition not available');
      return;
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size
    canvas.width = 200;
    canvas.height = 200;
    centerXRef.current = canvas.width / 2;
    centerYRef.current = canvas.height / 2;
    
    initParticles();
    setupSpeechRecognition();
    
    // Start animation
    animate();
    
    // Add click listener
    canvas.addEventListener('click', handleCanvasClick);
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [initParticles, setupSpeechRecognition, animate, handleCanvasClick]);

  return (
    <div 
      ref={containerRef}
      className={`voice-orb-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '20px',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          cursor: 'pointer',
          borderRadius: '50%',
          boxShadow: '0 0 30px rgba(0, 212, 255, 0.3)',
        }}
      />
      <div 
        ref={statusRef}
        style={{
          fontSize: '14px',
          color: 'var(--accent-primary)',
          textAlign: 'center',
          minHeight: '20px',
          fontWeight: '500',
        }}
      >
        {statusText}
      </div>
      <div 
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          opacity: 0.7,
        }}
      >
        {isListening ? 'Click to stop listening' : 'Click to speak'}
      </div>
    </div>
  );
};
