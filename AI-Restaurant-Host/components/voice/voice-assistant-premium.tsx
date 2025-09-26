'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhoneIcon, 
  PhoneXMarkIcon, 
  MicrophoneIcon,
  LanguageIcon,
  UserIcon,
  SparklesIcon,
  QuestionMarkCircleIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { voiceAgentService } from '@/lib/services/voice-agent-service';
import { useLanguage } from '@/lib/language-context';
import { AudioReactiveBackground } from './audio-reactive-background';
import { CircularAudioVisualizer } from './circular-audio-visualizer';
import { LanguageToggle } from './language-toggle';

interface ConversationEntry {
  id: string;
  speaker: 'Patient' | 'Sarah' | 'System';
  text: string;
  timestamp: string;
  language?: 'en' | 'it';
  sentiment?: 'calm' | 'concerned' | 'urgent';
}

export function VoiceAssistantPremium() {
  const { t, language } = useLanguage();
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'reconnecting'>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioFrequency, setAudioFrequency] = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [isAITyping, setIsAITyping] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Audio processing loop
  useEffect(() => {
    const processAudio = () => {
      if (analyserRef.current && dataArrayRef.current) {
        // Get frequency data
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        
        // Calculate RMS for volume and mic level
        let sum = 0;
        let rmsSum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
          rmsSum += dataArrayRef.current[i] * dataArrayRef.current[i];
        }
        
        // Update mic level for visual indicator
        const average = sum / dataArrayRef.current.length;
        setMicLevel(Math.min(1, average / 128));
        
        // Calculate RMS for audio level
        const rms = Math.sqrt(rmsSum / dataArrayRef.current.length);
        const normalizedLevel = Math.min(1, rms / 128);
        
        // Find dominant frequency
        let maxValue = 0;
        let maxIndex = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          if (dataArrayRef.current[i] > maxValue) {
            maxValue = dataArrayRef.current[i];
            maxIndex = i;
          }
        }
        
        const nyquist = audioContextRef.current!.sampleRate / 2;
        const frequency = (maxIndex / dataArrayRef.current.length) * nyquist / 1000;
        
        // Update state with smoothing
        setAudioLevel(prev => prev * 0.7 + normalizedLevel * 0.3);
        setAudioFrequency(frequency);
        setFrequencyData(new Uint8Array(dataArrayRef.current));
      } else if (isUserSpeaking || isAgentSpeaking) {
        // Simulate audio levels when speaking but no real audio data
        const time = Date.now() / 1000;
        const simulatedLevel = 0.3 + Math.sin(time * 5) * 0.2 + Math.random() * 0.1;
        setAudioLevel(prev => prev * 0.8 + simulatedLevel * 0.2);
        
        // Create simulated frequency data
        const simulatedData = new Uint8Array(128);
        for (let i = 0; i < simulatedData.length; i++) {
          simulatedData[i] = Math.random() * 128 * simulatedLevel;
        }
        setFrequencyData(simulatedData);
      } else {
        // Gradually decrease audio level when not speaking
        setAudioLevel(prev => prev * 0.9);
      }
      
      animationFrameRef.current = requestAnimationFrame(processAudio);
    };

    if (isCallActive) {
      processAudio();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCallActive, isUserSpeaking, isAgentSpeaking]);

  // Auto-scroll conversation and handle scroll detection
  useEffect(() => {
    if (scrollAreaRef.current && !isScrolledUp) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversation, isScrolledUp]);
  
  // Handle scroll position detection
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsScrolledUp(!isNearBottom);
      
      if (!isNearBottom) {
        // Track unread messages when scrolled up
        setUnreadCount(prev => prev);
      } else {
        setUnreadCount(0);
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Retry countdown for connection errors
  useEffect(() => {
    if (connectionStatus === 'error' && retryCountdown === 0) {
      setRetryCountdown(5);
    }
    
    if (retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(prev => prev - 1);
        if (retryCountdown === 1) {
          handleStartCall(); // Auto-retry
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, retryCountdown]);

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (minutes < 120) return '1 hour ago';
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
    return 'Today';
  };

  const addToConversation = (speaker: 'Patient' | 'Sarah' | 'System', text: string) => {
    // Simple sentiment detection
    let sentiment: 'calm' | 'concerned' | 'urgent' = 'calm';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('emergency') || lowerText.includes('pain') || lowerText.includes('urgent')) {
      sentiment = 'urgent';
    } else if (lowerText.includes('worry') || lowerText.includes('concerned') || lowerText.includes('problem')) {
      sentiment = 'concerned';
    }
    
    const now = new Date();
    const entry: ConversationEntry = {
      id: Date.now().toString(),
      speaker,
      text,
      timestamp: getRelativeTime(now),
      language: language as 'en' | 'it',
      sentiment
    };
    setConversation(prev => [...prev, entry]);
  };
  
  // Play sound effects
  const playSound = (type: 'connect' | 'disconnect') => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'connect') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    } else {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    }
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const handleStartCall = async () => {
    try {
      setConnectionStatus('connecting');
      setConversation([]);
      // Generate session ID
      setSessionId(`CNX-${Date.now().toString(36).toUpperCase()}`);
      
      // Get microphone access with noise reduction settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      // Set up Web Audio API for visualization
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      // Connect microphone to analyser
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      
      // Initialize data array for frequency data
      dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      // Initialize voice agent
      await voiceAgentService.initialize();
      
      const started = await voiceAgentService.startAgent({
        onTranscript: (text: string, role: 'user' | 'agent') => {
          if (role === 'user') {
            setCurrentTranscript(text);
            if (text && !isUserSpeaking) {
              addToConversation('Patient', text);
              setCurrentTranscript('');
            }
          } else {
            setIsAITyping(true);
            setTimeout(() => {
              setIsAITyping(false);
              addToConversation('Sarah', text);
              if (isScrolledUp) {
                setUnreadCount(prev => prev + 1);
              }
            }, 500);
          }
        },
        
        onConnectionChange: (connected: boolean) => {
          setConnectionStatus(connected ? 'connected' : 'idle');
          if (connected) {
            addToConversation('Sarah', t('greeting'));
          }
        },
        
        onUserStartedSpeaking: () => {
          setIsUserSpeaking(true);
          // Simulate audio activity if analyser isn't picking it up
          if (!analyserRef.current || !dataArrayRef.current) {
            setAudioLevel(0.3 + Math.random() * 0.3);
          }
        },
        
        onUserStoppedSpeaking: () => {
          setIsUserSpeaking(false);
          if (currentTranscript) {
            addToConversation('Patient', currentTranscript);
            setCurrentTranscript('');
          }
          // Reset audio level
          setAudioLevel(0);
        },
        
        onAgentStartedSpeaking: () => {
          setIsAgentSpeaking(true);
          // Simulate audio activity for agent
          if (!analyserRef.current || !dataArrayRef.current) {
            setAudioLevel(0.4 + Math.random() * 0.3);
          }
        },
        
        onAgentStoppedSpeaking: () => {
          setIsAgentSpeaking(false);
          // Reset audio level
          setAudioLevel(0);
        },
        
        onError: (error: any) => {
          console.error('Voice Agent error:', error);
          setConnectionStatus('error');
        }
      });
      
      if (started) {
        setIsCallActive(true);
        setConnectionStatus('connected');
        playSound('connect');
      }
    } catch (error) {
      console.error('Failed to start call:', error);
      setConnectionStatus('error');
      setIsCallActive(false);
    }
  };

  const handleEndCall = async () => {
    try {
      playSound('disconnect');
      await voiceAgentService.stop();
      
      // Clean up audio context and analyser
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setIsCallActive(false);
      setConnectionStatus('idle');
      setCurrentTranscript('');
      setIsUserSpeaking(false);
      setIsAgentSpeaking(false);
      setAudioLevel(0);
      setFrequencyData(null);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  return (
    <>
      {/* Animated Background */}
      <div className="absolute inset-0">
        <AudioReactiveBackground 
          audioLevel={audioLevel}
          isActive={isUserSpeaking || isAgentSpeaking}
          frequency={audioFrequency}
        />
      </div>
      
      {/* Main Content */}
      <div className="relative z-20 w-full h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="w-full h-full lg:max-w-7xl"
        >
          {/* Glass Card with Reflection */}
          <Card className="relative bg-white sm:bg-white/70 sm:backdrop-blur-2xl border-0 sm:border sm:border-white/50 shadow-none sm:shadow-2xl overflow-hidden h-full w-full group rounded-none sm:rounded-lg">
            {/* Glass reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50/20 via-transparent to-blue-50/20 pointer-events-none" />
            
            <div className="relative z-10 p-3 sm:p-4 md:p-6 h-full w-full flex flex-col lg:flex-row gap-2 sm:gap-4 lg:gap-6">
              {/* Left Panel - Animation & Controls */}
              <div className="flex-shrink-0 w-full lg:w-[420px] flex flex-col h-auto lg:h-full">
                {/* Header */}
                <div className="flex flex-col items-center text-center mb-2 sm:mb-4 lg:mb-6 lg:flex-row lg:items-start lg:text-left lg:justify-between">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-full lg:w-auto"
                  >
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                      ConaxaAI Receptionist
                    </h1>
                    <p className="text-gray-700 text-xs sm:text-sm mt-1 font-medium">
                      {t('intelligentReceptionist')}
                    </p>
                    <p className="hidden sm:block text-gray-500 text-xs mt-2 leading-relaxed">
                      24/7 AI-powered dental assistant handling appointments, 
                      patient inquiries, and emergency triage with natural 
                      conversation in multiple languages.
                    </p>
                  </motion.div>
                  
                  <div className="hidden sm:block">
                    <LanguageToggle />
                  </div>
                </div>

                {/* Circular Audio Visualizer or Loading Skeleton */}
                <motion.div 
                  className="flex justify-center items-center my-2 sm:my-4 lg:flex-1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {connectionStatus === 'connecting' ? (
                    <div className="relative">
                      <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] lg:w-[280px] lg:h-[280px] rounded-full bg-gradient-to-r from-gray-200 to-gray-100 animate-pulse" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="mb-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="inline-block"
                            >
                              <SparklesIcon className="w-8 h-8 text-gray-400" />
                            </motion.div>
                          </div>
                          <p className="text-sm text-gray-600">Connecting to AI...</p>
                          <p className="text-xs text-gray-400 mt-1">Setting up secure channel</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] lg:w-[280px] lg:h-[280px] mx-auto">
                      <CircularAudioVisualizer
                        audioData={frequencyData || undefined}
                        audioLevel={audioLevel}
                        isUserSpeaking={isUserSpeaking}
                        isAgentSpeaking={isAgentSpeaking}
                        size={280}
                      />
                    </div>
                  )}
                </motion.div>

                {/* Call Controls */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center mb-2 sm:mb-4 lg:mb-6"
                >
                {!isCallActive ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleStartCall}
                      disabled={connectionStatus === 'connecting'}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                      <div className="relative px-6 py-3 sm:px-8 sm:py-3.5 lg:px-10 lg:py-4 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full font-semibold text-sm sm:text-base shadow-xl flex items-center gap-2 transform transition-transform active:scale-95">
                        <PhoneIcon className="w-5 h-5" />
                        {connectionStatus === 'connecting' ? t('connecting') : t('startCall')}
                      </div>
                    </motion.button>
                ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleEndCall}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-500 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                      <div className="relative px-6 py-3 sm:px-8 sm:py-3.5 lg:px-10 lg:py-4 bg-gradient-to-r from-red-400 to-pink-500 text-white rounded-full font-semibold text-sm sm:text-base shadow-xl flex items-center gap-2 transform transition-transform active:scale-95">
                        <PhoneXMarkIcon className="w-5 h-5" />
                        {t('endCall')}
                      </div>
                    </motion.button>
                  )}
                </motion.div>

                {/* Status Indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center"
                >
                <div className={cn(
                  "px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium inline-flex items-center gap-2",
                  connectionStatus === 'connected' && "bg-green-100 text-green-700",
                  connectionStatus === 'connecting' && "bg-yellow-100 text-yellow-700",
                  connectionStatus === 'reconnecting' && "bg-orange-100 text-orange-700",
                  connectionStatus === 'error' && "bg-red-100 text-red-700",
                  connectionStatus === 'idle' && "bg-gray-100 text-gray-700"
                )}>
                  <motion.div
                    animate={{
                      scale: connectionStatus === 'connected' ? [1, 1.2, 1] : 1
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      connectionStatus === 'connected' && "bg-green-500",
                      connectionStatus === 'connecting' && "bg-yellow-500",
                      connectionStatus === 'error' && "bg-red-500",
                      connectionStatus === 'idle' && "bg-gray-500"
                    )}
                  />
                  {connectionStatus === 'connected' && t('connected')}
                  {connectionStatus === 'connecting' && t('connecting')}
                  {connectionStatus === 'reconnecting' && 'Reconnecting...'}
                  {connectionStatus === 'error' && (
                    <span className="flex items-center gap-1">
                      <ArrowPathIcon className="w-3 h-3 animate-spin" />
                      Retry in {retryCountdown}s
                    </span>
                  )}
                  {connectionStatus === 'idle' && t('ready')}
                  </div>
                </motion.div>
                
                {/* Accessibility Controls - Hidden on mobile */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="hidden sm:flex mt-4 justify-center gap-2"
                >
                  
                  <button
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="Volume Control"
                  >
                    <SpeakerWaveIcon className="w-4 h-4 text-gray-600" />
                  </button>
                </motion.div>
                
                {/* Microphone Level Indicator */}
                {isCallActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 px-4"
                  >
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <MicrophoneIcon className="w-3 h-3" />
                      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-green-400 to-blue-400"
                          animate={{ width: `${micLevel * 100}%` }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                      {isUserSpeaking && <span className="text-green-600">Listening...</span>}
                    </div>
                  </motion.div>
                )}
                
                {/* Session Info - Hidden on mobile */}
                {sessionId && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="hidden sm:block mt-2 text-center"
                  >
                    <p className="text-xs text-gray-500">
                      Session: <span className="font-mono">{sessionId}</span>
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Right Panel - Conversation */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Poor Connection Banner */}
                {connectionQuality === 'poor' && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-2 p-2 bg-orange-100 border border-orange-300 rounded-lg flex items-center gap-2"
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    <p className="text-xs text-orange-700">Poor connection detected. Audio quality may be affected.</p>
                  </motion.div>
                )}
                {/* Current Transcript */}
                <AnimatePresence>
                  {currentTranscript && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4"
                    >
                      <div className="p-3 bg-blue-50/50 backdrop-blur rounded-xl border border-blue-200/30">
                        <p className="text-blue-700 text-sm">
                          <span className="font-medium">{t('youAreSaying')}: </span>
                          {currentTranscript}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Conversation */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex-1 flex flex-col min-h-0 h-full"
                >
                  <div className="flex items-center justify-between mb-2 sm:mb-3 px-2 sm:px-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-700">
                      {t('conversation')}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {conversation.length} messages
                    </span>
                  </div>
                  
                  <ScrollArea className="flex-1 h-full w-full" ref={scrollAreaRef}>
                    <div className="space-y-2 sm:space-y-3 px-3 sm:px-0 sm:pr-4">
                      {conversation.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 sm:py-12 space-y-3 sm:space-y-6">
                          <div className="relative">
                            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-pink-300 to-blue-300 rounded-full blur-2xl opacity-20" />
                            <SparklesIcon className="relative w-12 h-12 sm:w-16 sm:h-16 text-gray-300" />
                          </div>
                          <div className="text-center space-y-2 sm:space-y-3 max-w-md px-4">
                            <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-700">
                              {isCallActive ? 'Ready to Assist You' : 'Welcome to ConaxaAI'}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {isCallActive ? t('waitingForConversation') : 'Click "Start Call" to begin your conversation'}
                            </p>
                            {!isCallActive && (
                              <div className="pt-3 sm:pt-4 space-y-2">
                                <p className="text-[10px] sm:text-xs font-medium text-gray-600 uppercase tracking-wider">Sample Questions:</p>
                                <div className="space-y-1 text-left">
                                  <p className="text-[10px] sm:text-xs text-gray-500 pl-3 sm:pl-4">• "I need to schedule an appointment"</p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 pl-3 sm:pl-4">• "What are your office hours?"</p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 pl-3 sm:pl-4">• "I have a dental emergency"</p>
                                  <p className="text-[10px] sm:text-xs text-gray-500 pl-3 sm:pl-4">• "Can you help with insurance questions?"</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* AI Typing Indicator */}
                          {isAITyping && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="flex gap-3 mb-3"
                            >
                              <motion.div 
                                className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-md"
                              >
                                <SparklesIcon className="w-5 h-5 text-white" />
                              </motion.div>
                              <div className="bg-gradient-to-r from-pink-100 to-pink-50 rounded-2xl p-3 shadow-md">
                                <div className="flex items-center gap-1">
                                  <motion.span
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                                    className="w-2 h-2 bg-pink-400 rounded-full"
                                  />
                                  <motion.span
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                                    className="w-2 h-2 bg-pink-400 rounded-full"
                                  />
                                  <motion.span
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                                    className="w-2 h-2 bg-pink-400 rounded-full"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                          
                          {conversation.map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ 
                              type: "spring",
                              stiffness: 500,
                              damping: 30,
                              delay: index * 0.05 
                            }}
                            className={cn(
                              "flex gap-2 sm:gap-3",
                              entry.speaker === 'Patient' && "flex-row-reverse"
                            )}
                          >
                            {/* Avatar */}
                            <motion.div 
                              className={cn(
                                "flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-md",
                                entry.speaker === 'Patient' && "bg-gradient-to-br from-blue-400 to-blue-600",
                                entry.speaker === 'Sarah' && "bg-gradient-to-br from-pink-400 to-pink-600",
                                entry.speaker === 'System' && "bg-gray-400"
                              )}
                              whileHover={{ scale: 1.1 }}
                            >
                              {entry.speaker === 'Patient' ? (
                                <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              ) : (
                                <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              )}
                            </motion.div>

                            {/* Message Bubble with Enhanced Styling */}
                            <motion.div 
                              className={cn(
                                "relative max-w-[90%] sm:max-w-[75%] p-2.5 sm:p-3 rounded-2xl transition-all duration-200",
                                entry.speaker === 'Patient' && "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-900 shadow-md hover:shadow-lg",
                                entry.speaker === 'Sarah' && "bg-gradient-to-r from-pink-100 to-pink-50 text-pink-900 shadow-md hover:shadow-lg",
                                entry.speaker === 'System' && "bg-gray-100 text-gray-700 shadow-sm"
                              )}
                              whileHover={{ scale: 1.02, y: -2 }}
                              style={{
                                boxShadow: entry.speaker === 'Sarah' 
                                  ? '0 4px 15px rgba(236, 72, 153, 0.15)' 
                                  : entry.speaker === 'Patient'
                                  ? '0 4px 15px rgba(59, 130, 246, 0.15)'
                                  : undefined
                              }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs sm:text-sm font-medium">{entry.speaker}</p>
                                {entry.speaker === 'Sarah' && (
                                  <CheckCircleIcon className="w-3 h-3 text-green-500" />
                                )}
                                {entry.language && (
                                  <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                                    {entry.language.toUpperCase()}
                                  </span>
                                )}
                                {entry.sentiment && (
                                  <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    entry.sentiment === 'calm' && "bg-green-400",
                                    entry.sentiment === 'concerned' && "bg-yellow-400",
                                    entry.sentiment === 'urgent' && "bg-red-400"
                                  )} title={entry.sentiment} />
                                )}
                              </div>
                              <p className="text-xs sm:text-sm leading-relaxed">{entry.text}</p>
                              <p className="text-[10px] sm:text-xs opacity-60 mt-2 flex items-center gap-1">
                                {entry.timestamp}
                              </p>
                            </motion.div>
                          </motion.div>
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* Jump to Bottom Button */}
                  {isScrolledUp && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => {
                        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
                        if (scrollContainer) {
                          scrollContainer.scrollTop = scrollContainer.scrollHeight;
                          setUnreadCount(0);
                        }
                      }}
                      className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDownIcon className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </motion.button>
                  )}
                </motion.div>
              </div>
            </div>
            
            {/* Powered by ConaxaAI - Hidden on mobile */}
            <div className="hidden sm:flex absolute bottom-0 left-0 right-0 p-3 items-center justify-center">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex items-center gap-2 text-xs text-gray-500"
              >
                <span>Powered by</span>
                <span className="font-semibold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                  ConaxaAI
                </span>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    </>
  );
}