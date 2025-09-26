'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, Mic, MicOff, Volume2, 
  User, Bot, Loader2, CheckCircle, XCircle,
  MessageCircle, Clock, Activity, Sparkles, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { deepgramService } from '@/lib/services/deepgram-service';
import { audioService } from '@/lib/services/audio-service';
import { DentalAIAgent } from '@/lib/services/dental-ai-agent';
import { aiApiService } from '@/lib/services/ai-api-service';

interface ConversationEntry {
  id: number;
  speaker: string;
  text: string;
  type: string;
  timestamp: string;
}

interface VoiceAssistantProps {
  onCallStatusChange?: (isActive: boolean) => void;
  onConversationUpdate?: (conversation: ConversationEntry[]) => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function VoiceAssistant({ 
  onCallStatusChange, 
  onConversationUpdate 
}: VoiceAssistantProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiAgentRef = useRef(new DentalAIAgent());
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioQueueRef = useRef<Array<{ audioUrl: string; text: string }>>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (isCallActive) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      setCallDuration(0);
    }
    
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isCallActive]);

  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  useEffect(() => {
    if (onCallStatusChange) {
      onCallStatusChange(isCallActive);
    }
  }, [isCallActive, onCallStatusChange]);

  useEffect(() => {
    if (onConversationUpdate) {
      onConversationUpdate(conversation);
    }
  }, [conversation, onConversationUpdate]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const addToConversation = (speaker: string, text: string, type: string = 'message') => {
    const entry: ConversationEntry = {
      id: Date.now(),
      speaker,
      text,
      type,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    setConversation(prev => [...prev, entry]);
  };

  // Play audio queue sequentially
  const playNextAudio = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    
    const { audioUrl } = audioQueueRef.current.shift()!;
    
    try {
      await audioService.playAudio(audioUrl);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
    
    setIsSpeaking(false);
    isPlayingRef.current = false;
    
    // Check if there are more audio items to play
    if (audioQueueRef.current.length > 0) {
      setTimeout(playNextAudio, 50);
    }
  };

  const handleAnswerCall = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Play ringtone
      await audioService.playRingtone();
      
      // Initialize audio
      await audioService.initialize();
      
      // Start Deepgram connection with proper event handling
      await deepgramService.startTranscription(
        async (text: string, isFinal: boolean) => {
          setCurrentTranscript(text);
          
          if (isFinal && text.trim()) {
            // Clear silence timer when user speaks
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }
            
            const cleanText = text.trim();
            // Check if it's just a filler sound or very short
            const isJustFiller = cleanText.length < 3 || 
                                cleanText.match(/^(um+|uh+|ah+|oh+|hmm+|mm+|er+)$/i) ||
                                cleanText.match(/^(okay|ok|yes|yeah|no|nah)$/i);
            
            // Always add to conversation for context
            addToConversation('Patient', text);
            setCurrentTranscript('');
            
            // Only process substantial messages
            if (!isJustFiller || cleanText.length > 5) {
              // Process with AI agent
              setIsProcessing(true);
              setIsListening(false);
              
              try {
                // Use API service for better AI responses
                const response = await aiApiService.processMessage(text);
                
                // Check if it's a trauma case
                if (response.isTrauma) {
                  // Add urgent marker to conversation
                  addToConversation('System', '⚠️ TRAUMA CASE DETECTED', 'alert');
                  
                  // If ER referral needed, emphasize urgency
                  if (response.requiresER) {
                    addToConversation('Sarah', '🚨 THIS IS A MEDICAL EMERGENCY', 'emergency');
                  }
                }
                
                // Check if user wants to end the call
                const messageLower = text.toLowerCase();
                const isEndingCall = messageLower.includes('bye') || 
                                     messageLower.includes('goodbye') || 
                                     messageLower.includes('thank you bye') ||
                                     messageLower.includes('see you') ||
                                     messageLower.includes('talk to you later');
                
                // Only add response if meaningful
                if (response.response && response.response.trim()) {
                  // Add AI response to conversation
                  const responseType = response.isTrauma ? 'trauma' : 
                                      response.intent === 'appointment_booking' ? 'appointment' : 
                                      'message';
                  addToConversation('Sarah', response.response, responseType);
                  
                  // Add instructions if present (for trauma cases)
                  if (response.instructions && response.instructions.length > 0) {
                    const instructionText = "Please follow these steps:\n" + 
                                          response.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n');
                    addToConversation('Sarah', instructionText, 'instructions');
                  }
                  
                  // Convert response to speech and add to queue
                  const audioUrl = await deepgramService.textToSpeech(
                    response.response, 
                    'aura-asteria-en' // Female voice - Asteria
                  );
                  
                  // Add to audio queue instead of playing immediately
                  audioQueueRef.current.push({ audioUrl, text: response.response });
                  
                  // Start playing if not already playing
                  if (!isPlayingRef.current) {
                    playNextAudio();
                  }
                  
                  // If appointment was created, show confirmation
                  if (response.appointment) {
                    addToConversation('System', 
                      `✅ Appointment confirmed: ${response.appointment.confirmationNumber}`, 
                      'confirmation'
                    );
                  }
                }
                
                // If user said bye, end the call after AI responds
                if (isEndingCall) {
                  setTimeout(() => {
                    handleEndCall();
                  }, 3000);
                } else {
                  // Resume listening after processing
                  setIsListening(true);
                }
              
                // Set silence timer to detect when user stops talking
                silenceTimerRef.current = setTimeout(() => {
                  if (isListening && !currentTranscript) {
                    // Prompt user if silent for too long
                    const prompt = "Are you still there? How else can I help you today?";
                    addToConversation('Sarah', prompt, 'prompt');
                    deepgramService.textToSpeech(prompt, 'aura-luna-en').then(url => {
                      audioService.playAudio(url);
                    });
                  }
                }, 8000);
              } catch (error) {
                console.error('Processing error:', error);
                addToConversation('System', 'Error processing request. Please try again.', 'error');
              } finally {
                setIsProcessing(false);
              }
            } else {
              // For simple fillers, just keep listening without processing
              setIsListening(true);
            }
          }
        },
        (error: Error) => {
          console.error('Transcription error:', error);
          setConnectionStatus('error');
          addToConversation('System', 'Connection error. Please check your microphone.', 'error');
        }
      );
      
      // Start recording with volume monitoring
      audioService.startRecording(
        (audioData: ArrayBuffer) => {
          deepgramService.sendAudio(audioData);
        },
        (volumeLevel: number) => {
          setAudioLevel(volumeLevel);
        }
      );
      
      setIsCallActive(true);
      setIsListening(true);
      setConnectionStatus('connected');
      
      // Initial greeting with female voice
      const greeting = "Hello! Thank you for calling DentalCare. I'm Sarah, your AI dental assistant. How may I help you today?";
      addToConversation('Sarah', greeting, 'greeting');
      
      const audioUrl = await deepgramService.textToSpeech(greeting, 'aura-asteria-en');
      audioQueueRef.current.push({ audioUrl, text: greeting });
      playNextAudio();
      
    } catch (error) {
      console.error('Failed to answer call:', error);
      setConnectionStatus('error');
      alert('Failed to initialize call. Please check your microphone permissions.');
    }
  };

  const handleEndCall = () => {
    // Clear all timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    audioService.stopRecording();
    deepgramService.stopTranscription();
    audioService.cleanup();
    
    setIsCallActive(false);
    setIsListening(false);
    setIsSpeaking(false);
    setCurrentTranscript('');
    setConnectionStatus('disconnected');
    setAudioLevel(0);
    
    // Reset AI conversation
    aiApiService.resetConversation();
    
    // Add end call message
    if (conversation.length > 0) {
      addToConversation('System', 'Call ended', 'system');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      audioService.startRecording(
        (audioData: ArrayBuffer) => {
          deepgramService.sendAudio(audioData);
        },
        (volumeLevel: number) => {
          setAudioLevel(volumeLevel);
        }
      );
      setIsListening(true);
    } else {
      audioService.stopRecording();
      setIsListening(false);
      setAudioLevel(0);
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-50 border-green-200';
      case 'connecting': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4" />;
      case 'connecting': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Panel - Call Controls */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardContent className="p-6">
            {/* AI Assistant Info */}
            <div className="text-center mb-6">
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <Bot className="w-12 h-12 text-white" />
                </div>
                {isCallActive && (
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </div>
              <h3 className="text-xl font-semibold mb-1">Sarah AI</h3>
              <p className="text-sm text-muted-foreground">Dental Assistant</p>
            </div>

            {/* Connection Status */}
            <div className="mb-6">
              <Card className={`p-4 ${getStatusColor(connectionStatus)}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(connectionStatus)}
                    <span className="text-sm capitalize">{connectionStatus}</span>
                  </div>
                </div>
                
                {isCallActive && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <div className="flex items-center justify-between text-sm">
                      <span>Duration</span>
                      <Badge variant="outline" className="font-mono">
                        {formatDuration(callDuration)}
                      </Badge>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Call Controls */}
            <div className="space-y-4">
              {!isCallActive ? (
                <Button
                  onClick={handleAnswerCall}
                  className="w-full py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl flex items-center justify-center space-x-3 transition-all transform hover:scale-105"
                  size="lg"
                >
                  <Phone className="w-5 h-5" />
                  <span>Start Call with Sarah</span>
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? "destructive" : "outline"}
                    className="py-3 rounded-xl font-medium flex items-center justify-center space-x-2"
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    <span>{isMuted ? 'Muted' : 'Mute'}</span>
                  </Button>
                  
                  <Button
                    onClick={handleEndCall}
                    variant="destructive"
                    className="py-3 rounded-xl font-medium flex items-center justify-center space-x-2"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>End</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Activity Indicators */}
            {isCallActive && (
              <div className="mt-6 space-y-3">
                {/* Microphone Volume Indicator */}
                <Card className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Microphone Level</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{audioLevel}%</Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-100 ${
                        audioLevel > 60 ? 'bg-red-500' : 
                        audioLevel > 30 ? 'bg-yellow-500' : 
                        audioLevel > 5 ? 'bg-green-500' : 
                        'bg-gray-400'
                      }`}
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                  {audioLevel === 0 && isListening && (
                    <p className="text-xs text-yellow-600 mt-2">No audio detected - check microphone</p>
                  )}
                </Card>
                
                <Card className={`p-3 ${isListening ? 'bg-blue-50 border-blue-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mic className={`w-4 h-4 ${isListening ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span className="text-sm">Listening</span>
                    </div>
                    {isListening && (
                      <div className="flex space-x-1">
                        <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" />
                        <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    )}
                  </div>
                </Card>

                <Card className={`p-3 ${isSpeaking ? 'bg-purple-50 border-purple-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-purple-600' : 'text-gray-500'}`} />
                      <span className="text-sm">Speaking</span>
                    </div>
                    {isSpeaking && (
                      <div className="flex space-x-1">
                        <div className="w-1 h-3 bg-purple-500 rounded-full animate-pulse" />
                        <div className="w-1 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-1 h-3 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                    )}
                  </div>
                </Card>

                <Card className={`p-3 ${isProcessing ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Brain className={`w-4 h-4 ${isProcessing ? 'text-yellow-600' : 'text-gray-500'}`} />
                      <span className="text-sm">Processing</span>
                    </div>
                    {isProcessing && (
                      <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
                    )}
                  </div>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Conversation */}
      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          {/* Header */}
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <CardTitle>Conversation</CardTitle>
              </div>
              {conversation.length > 0 && (
                <Button 
                  onClick={() => setConversation([])}
                  variant="ghost"
                  size="sm"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversation.length === 0 && !isCallActive ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Sparkles className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">No conversation yet</p>
                <p className="text-sm text-gray-500">Click "Start Call" to begin talking with Sarah</p>
              </div>
            ) : (
              <>
                {conversation.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex ${entry.speaker === 'Patient' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1`}
                  >
                    <div className={`max-w-[70%] ${entry.speaker === 'Patient' ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-start space-x-2">
                        {entry.speaker !== 'Patient' && (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            entry.speaker === 'Sarah' 
                              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                              : 'bg-gray-200'
                          }`}>
                            {entry.speaker === 'Sarah' ? (
                              <Bot className="w-4 h-4 text-white" />
                            ) : (
                              <Activity className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-baseline space-x-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {entry.speaker}
                            </Badge>
                            <span className="text-xs text-gray-500">{entry.timestamp}</span>
                          </div>
                          
                          <Card className={`p-3 ${
                            entry.speaker === 'Patient'
                              ? 'bg-blue-50 border-blue-200'
                              : entry.speaker === 'Sarah'
                              ? 'bg-purple-50 border-purple-200'
                              : entry.type === 'error'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}>
                            <p className="text-sm whitespace-pre-line">{entry.text}</p>
                          </Card>
                        </div>
                        
                        {entry.speaker === 'Patient' && (
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Current transcript (live typing) */}
                {currentTranscript && (
                  <div className="flex justify-end animate-in slide-in-from-bottom-1">
                    <div className="max-w-[70%]">
                      <div className="flex items-start space-x-2">
                        <div className="flex-1">
                          <Card className="p-3 bg-blue-100 border-blue-300 border-dashed">
                            <p className="text-sm italic text-blue-800">{currentTranscript}</p>
                          </Card>
                        </div>
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={conversationEndRef} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}