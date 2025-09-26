'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhoneIcon, 
  PhoneXMarkIcon, 
  MicrophoneIcon, 
  SpeakerWaveIcon,
  SignalIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';
import { 
  PhoneIcon as PhoneOutlineIcon,
  MicrophoneIcon as MicrophoneOutlineIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { voiceAgentService } from '@/lib/services/voice-agent-service';
import { useLanguage } from '@/lib/language-context';
import { VoiceWaveform } from './voice-waveform';
import { LanguageToggle } from './language-toggle';
import { MessageBubble } from './message-bubble';

interface ConversationEntry {
  id: string;
  speaker: 'Patient' | 'Sarah' | 'System';
  text: string;
  timestamp: string;
  type?: 'message' | 'appointment' | 'emergency' | 'alert' | 'confirmation';
}

export function VoiceAssistantV2() {
  const { t, language } = useLanguage();
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef(Date.now().toString());

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversation]);

  const addToConversation = (speaker: 'Patient' | 'Sarah' | 'System', text: string, type?: string) => {
    const entry: ConversationEntry = {
      id: Date.now().toString(),
      speaker,
      text,
      type: type as any || 'message',
      timestamp: new Date().toLocaleTimeString(language === 'it' ? 'it-IT' : 'en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
    setConversation(prev => [...prev, entry]);
    
    // Simulate typing indicator for agent responses
    if (speaker === 'Sarah') {
      setIsTyping(false);
    }
  };

  const handleAnswerCall = async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');
      setConversation([]);
      
      // Add initial system message with language-specific text
      addToConversation('System', `📞 ${t('connectingToClinic')}`, 'alert');
      
      // Initialize and start Voice Agent
      await voiceAgentService.initialize();
      
      const started = await voiceAgentService.startAgent({
        onTranscript: (text: string, role: 'user' | 'agent') => {
          if (role === 'user') {
            setCurrentTranscript(text);
            // Add to conversation when user finishes speaking
            if (text && !isUserSpeaking) {
              addToConversation('Patient', text);
              setCurrentTranscript('');
            }
          } else {
            // Show typing indicator briefly before agent response
            setIsTyping(true);
            setTimeout(() => {
              addToConversation('Sarah', text);
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
        },
        
        onUserStoppedSpeaking: () => {
          setIsUserSpeaking(false);
          if (currentTranscript) {
            addToConversation('Patient', currentTranscript);
            setCurrentTranscript('');
          }
        },
        
        onAgentStartedSpeaking: () => {
          setIsAgentSpeaking(true);
        },
        
        onAgentStoppedSpeaking: () => {
          setIsAgentSpeaking(false);
        },
        
        onError: (error: any) => {
          console.error('Voice Agent error:', error);
          setError(t('connectionError'));
          setConnectionStatus('error');
        }
      });
      
      if (started) {
        setIsCallActive(true);
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Failed to start call:', error);
      setError('Failed to connect. Please check your microphone and try again.');
      setConnectionStatus('error');
      setIsCallActive(false);
    }
  };

  const handleEndCall = async () => {
    try {
      addToConversation('System', `📞 ${t('callEnded')}`, 'alert');
      
      await voiceAgentService.stop();
      
      setIsCallActive(false);
      setConnectionStatus('idle');
      setCurrentTranscript('');
      setIsUserSpeaking(false);
      setIsAgentSpeaking(false);
      setIsTyping(false);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    addToConversation('System', isMuted ? `🔊 ${t('microphoneUnmuted')}` : `🔇 ${t('microphoneMuted')}`, 'alert');
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return t('connected');
      case 'connecting': return t('connecting');
      case 'error': return t('connectionError');
      default: return t('ready');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex flex-col"
    >
      {/* Glass Card Container - now fills full height */}
      <Card className="relative flex-1 overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-white/20 shadow-2xl flex flex-col">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5 pointer-events-none" />
        
        <div className="relative z-10 p-6 space-y-4 flex flex-col flex-1 overflow-hidden">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                {t('voiceAssistant')}
              </h2>
              <p className="text-muted-foreground mt-1">
                {t('intelligentReceptionist')}
              </p>
            </motion.div>
            
            <div className="flex items-center gap-4">
              <LanguageToggle />
              
              {/* Connection Status */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 dark:bg-gray-800/50 backdrop-blur rounded-full"
              >
                <SignalIcon className={cn('w-4 h-4', getStatusColor())} />
                <span className="text-sm font-medium">{getStatusText()}</span>
                {connectionStatus === 'connected' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 bg-green-500 rounded-full"
                  />
                )}
              </motion.div>
            </div>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="destructive">
                  <ExclamationCircleIcon className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Voice Waveform Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="relative p-6 bg-gradient-to-r from-blue-50/50 to-green-50/50 dark:from-blue-950/20 dark:to-green-950/20 rounded-2xl"
          >
            {/* User Waveform */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <MicrophoneIcon className={cn(
                  "w-5 h-5 transition-colors",
                  isUserSpeaking ? "text-blue-500" : "text-gray-400"
                )} />
                <span className="text-sm font-medium">
                  {isUserSpeaking ? t('youSpeaking') : t('youSilent')}
                </span>
              </div>
              <VoiceWaveform isActive={isUserSpeaking} color="blue" height={60} />
            </div>

            {/* Agent Waveform */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SpeakerWaveIcon className={cn(
                  "w-5 h-5 transition-colors",
                  isAgentSpeaking ? "text-green-500" : "text-gray-400"
                )} />
                <span className="text-sm font-medium">
                  {isAgentSpeaking ? t('sarahSpeaking') : t('sarahSilent')}
                </span>
              </div>
              <VoiceWaveform isActive={isAgentSpeaking} color="green" height={60} />
            </div>
          </motion.div>

          {/* Call Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-4"
          >
            {!isCallActive ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAnswerCall}
                disabled={connectionStatus === 'connecting'}
                className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-3">
                  <PhoneIcon className="w-5 h-5" />
                  {connectionStatus === 'connecting' ? t('connecting') : t('startCall')}
                </span>
                
                {/* Ripple Effect */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-white/20"
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </motion.button>
            ) : (
              <>
                {/* Mute Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleMute}
                  className={cn(
                    "p-4 rounded-full shadow-lg transition-all",
                    isMuted 
                      ? "bg-gray-500 text-white" 
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  )}
                >
                  {isMuted ? (
                    <MicrophoneOutlineIcon className="w-6 h-6" />
                  ) : (
                    <MicrophoneIcon className="w-6 h-6" />
                  )}
                </motion.button>

                {/* End Call Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEndCall}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <span className="flex items-center gap-3">
                    <PhoneXMarkIcon className="w-5 h-5" />
                    {t('endCall')}
                  </span>
                </motion.button>
              </>
            )}
          </motion.div>

          {/* Current Transcript */}
          <AnimatePresence>
            {currentTranscript && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800"
              >
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-medium">{t('youAreSaying')}: </span>
                  {currentTranscript}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conversation History - now flexible height */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('conversation')}
            </h3>
            
            <ScrollArea className="flex-1 w-full rounded-xl bg-gray-50/50 dark:bg-gray-950/30 p-4" ref={scrollAreaRef}>
              <div className="space-y-2">
                {conversation.length === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-muted-foreground text-sm py-12"
                  >
                    {isCallActive ? t('waitingForConversation') : t('startCallToBegin')}
                  </motion.p>
                ) : (
                  <>
                    {conversation.map((entry, index) => (
                      <MessageBubble
                        key={entry.id}
                        speaker={entry.speaker}
                        text={entry.text}
                        timestamp={entry.timestamp}
                        type={entry.type}
                        index={index}
                      />
                    ))}
                    
                    {/* Typing Indicator */}
                    {isTyping && (
                      <MessageBubble
                        speaker="Sarah"
                        text="..."
                        timestamp=""
                        index={conversation.length}
                      />
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}