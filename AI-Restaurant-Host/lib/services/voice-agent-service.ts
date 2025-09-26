import { createClient, DeepgramClient, AgentEvents } from '@deepgram/sdk';
import { TTSPlayer } from './tts-player';
import { VoiceGate } from './voice-gate';
import { NoiseGate } from './noise-gate';

export class VoiceAgentService {
  private client: DeepgramClient | null = null;
  private agent: any = null; // AgentLiveClient type from SDK
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private isConnected: boolean = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private pendingTranscript: { content: string; role: 'user' | 'agent' } | null = null;
  private audioStartTime: number | null = null;
  private transcriptTime: number | null = null;
  private audioChunkCount: number = 0;
  private ttsPlayer: TTSPlayer | null = null;
  private voiceGate: VoiceGate | null = null;
  private noiseGate: NoiseGate | null = null;
  private currentTurnId: number = 0;
  private useSoftHandoff: boolean = false; // Can be configured
  private bargedOnce: boolean = false;     // One-shot barge per utterance
  private bargeAllowed: boolean = true;    // No-barge window control
  private noBargeTimer: NodeJS.Timeout | null = null;
  
  // Event callbacks
  private onTranscript?: (text: string, role: 'user' | 'agent') => void;
  private onAudio?: (audioData: string) => void;
  private onConnectionChange?: (connected: boolean) => void;
  private onError?: (error: any) => void;
  private onUserStartedSpeaking?: () => void;
  private onAgentStartedSpeaking?: () => void;
  private onAgentStoppedSpeaking?: () => void;
  private onUserStoppedSpeaking?: () => void;

  constructor() {
    console.log(`[${this.getTimestamp()}] VoiceAgentService initialized`);
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().split('T')[1].slice(0, -1); // HH:MM:SS.mmm format
  }

  async initialize() {
    try {
      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      
      if (!apiKey || apiKey === 'undefined') {
        throw new Error('Deepgram API key not configured');
      }
      
      this.client = createClient(apiKey);
      console.log(`[${this.getTimestamp()}] Deepgram client created successfully`);
      
      // Initialize audio context - let browser choose optimal sample rate
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log(`[${this.getTimestamp()}] AudioContext initialized with sample rate: ${this.audioContext.sampleRate}Hz`);
      
      // Initialize TTS player with the same context
      this.ttsPlayer = new TTSPlayer(this.audioContext);
      
      // Set up TTS speaking state callback for VAD boost and no-barge window
      this.ttsPlayer.onPlaybackActiveChange((speaking) => {
        if (speaking) {
          // TTS started speaking
          if (this.voiceGate) {
            this.voiceGate.setBoosted(true);
          }
          
          // Set no-barge window for first 300ms
          this.bargeAllowed = false;
          if (this.noBargeTimer) {
            clearTimeout(this.noBargeTimer);
          }
          this.noBargeTimer = setTimeout(() => {
            this.bargeAllowed = true;
            console.log(`[${this.getTimestamp()}] No-barge window ended - barge-in now allowed`);
          }, 300);
          
          console.log(`[${this.getTimestamp()}] TTS started speaking - VAD boost enabled, no-barge for 300ms`);
        } else {
          // TTS stopped speaking
          if (this.voiceGate) {
            this.voiceGate.setBoosted(false);
          }
          
          // Clear no-barge timer and reset flags
          if (this.noBargeTimer) {
            clearTimeout(this.noBargeTimer);
            this.noBargeTimer = null;
          }
          this.bargeAllowed = true;
          this.bargedOnce = false; // Reset for next utterance
          
          console.log(`[${this.getTimestamp()}] TTS stopped speaking - VAD boost disabled`);
        }
      });
      
      return true;
    } catch (error) {
      console.error(`[${this.getTimestamp()}] Failed to initialize VoiceAgentService:`, error);
      throw error;
    }
  }

  async startAgent(options: {
    onTranscript?: (text: string, role: 'user' | 'agent') => void;
    onAudio?: (audioData: string) => void;
    onConnectionChange?: (connected: boolean) => void;
    onError?: (error: any) => void;
    onUserStartedSpeaking?: () => void;
    onAgentStartedSpeaking?: () => void;
    onAgentStoppedSpeaking?: () => void;
    onUserStoppedSpeaking?: () => void;
  } = {}) {
    try {
      // Store callbacks
      this.onTranscript = options.onTranscript;
      this.onAudio = options.onAudio;
      this.onConnectionChange = options.onConnectionChange;
      this.onError = options.onError;
      this.onUserStartedSpeaking = options.onUserStartedSpeaking;
      this.onAgentStartedSpeaking = options.onAgentStartedSpeaking;
      this.onAgentStoppedSpeaking = options.onAgentStoppedSpeaking;
      this.onUserStoppedSpeaking = options.onUserStoppedSpeaking;

      if (!this.client) {
        await this.initialize();
      }

      console.log(`[${this.getTimestamp()}] Creating Voice Agent connection...`);
      
      // Create agent connection (no parameters, just like the example)
      this.agent = this.client!.agent();

      // Set up all event handlers
      this.setupEventHandlers();

      // Start the agent - it will emit Welcome event when ready
      console.log(`[${this.getTimestamp()}] Voice Agent connection created, waiting for Welcome event...`);
      
      // Start capturing audio from microphone
      await this.startAudioCapture();
      
      return true;
    } catch (error) {
      console.error(`[${this.getTimestamp()}] Failed to start Voice Agent:`, error);
      throw error;
    }
  }

  private setupEventHandlers() {
    if (!this.agent) return;

    // Welcome event - configure the agent here
    this.agent.on(AgentEvents.Welcome, () => {
      console.log(`[${this.getTimestamp()}] ✅ Welcome to Deepgram Voice Agent!`);
      
      // Configure the agent
      this.configureAgent();
      
      // Start keep-alive after configuration
      this.startKeepAlive();
    });

    // Connection opened
    this.agent.on(AgentEvents.Open, () => {
      console.log(`[${this.getTimestamp()}] ✅ Voice Agent connection opened`);
      this.isConnected = true;
      this.onConnectionChange?.(true);
    });

    // Connection closed
    this.agent.on(AgentEvents.Close, () => {
      console.log(`[${this.getTimestamp()}] Voice Agent connection closed`);
      this.isConnected = false;
      this.onConnectionChange?.(false);
      this.stopKeepAlive();
    });

    // Handle conversation text
    this.agent.on(AgentEvents.ConversationText, (data: any) => {
      const timestamp = this.getTimestamp();
      console.log(`[${timestamp}] 💬 Conversation [${data.role}]:`, data.content?.substring(0, 50) + (data.content?.length > 50 ? '...' : ''));
      
      if (data.role && data.content) {
        if (data.role === 'agent') {
          // Store agent transcript to show when audio starts playing
          this.pendingTranscript = { content: data.content, role: data.role };
          this.transcriptTime = Date.now();
          console.log(`[${timestamp}] 📝 Storing agent transcript for sync with audio`);
        } else {
          // Show user transcript immediately
          this.onTranscript?.(data.content, data.role);
        }
      }
    });

    // User speaking events
    this.agent.on(AgentEvents.UserStartedSpeaking, () => {
      console.log(`[${this.getTimestamp()}] 👤 User started speaking (Deepgram detected)`);
      // Note: VAD handles the actual TTS flush to prevent false triggers
      // This event is kept for tracking purposes
      this.audioChunkCount = 0;
    });

    // Use AgentThinking event to detect when user stops speaking
    this.agent.on(AgentEvents.AgentThinking, (data: any) => {
      console.log(`[${this.getTimestamp()}] 🤔 Agent thinking (user stopped speaking)`);
      this.onUserStoppedSpeaking?.();
    });

    // Agent speaking events
    this.agent.on(AgentEvents.AgentStartedSpeaking, () => {
      console.log(`[${this.getTimestamp()}] 🤖 Agent started speaking`);
      this.audioStartTime = Date.now();
      this.audioChunkCount = 0;
      
      // Increment turn ID for tracking
      this.currentTurnId++;
      
      // Start new utterance in TTS player
      if (this.ttsPlayer) {
        if (this.useSoftHandoff) {
          // Let current sentence finish before switching
          this.ttsPlayer.startUtteranceSoft();
          console.log(`[${this.getTimestamp()}] Using soft handoff for turn ${this.currentTurnId}`);
        } else {
          // Hard cut - immediately stop old audio
          this.ttsPlayer.startUtterance();
        }
      }
      this.onAgentStartedSpeaking?.();
    });

    // AgentAudioDone indicates agent has stopped speaking
    // (We already handle this event below for audio playback)

    // Handle audio chunks - queue them for sequential playback
    this.agent.on(AgentEvents.Audio, (data: any) => {
      this.audioChunkCount++;
      
      // Show transcript on first audio chunk
      if (this.pendingTranscript) {
        const delay = this.transcriptTime ? Date.now() - this.transcriptTime : 0;
        console.log(`[${this.getTimestamp()}] 🔊 First audio chunk received, showing transcript (delay: ${delay}ms)`);
        this.onTranscript?.(this.pendingTranscript.content, this.pendingTranscript.role);
        this.pendingTranscript = null;
        this.transcriptTime = null;
      }
      
      // Send audio to TTS player with turn tracking
      if (this.ttsPlayer) {
        if (this.useSoftHandoff) {
          // Use turn-based routing for soft handoff
          this.ttsPlayer.onAssistantTurnPacket(this.currentTurnId, data);
        } else {
          // Direct enqueue for hard cut mode
          this.ttsPlayer.enqueue(data);
        }
        
        // Log every 10th chunk to reduce spam
        if (this.audioChunkCount % 10 === 0) {
          const queueSize = this.ttsPlayer.getQueueSize();
          console.log(`[${this.getTimestamp()}] 🎵 Audio chunk ${this.audioChunkCount}, queue size: ${queueSize}, turn: ${this.currentTurnId}`);
        }
      }
    });

    // Agent finished sending audio
    this.agent.on(AgentEvents.AgentAudioDone, () => {
      const duration = this.audioStartTime ? Date.now() - this.audioStartTime : 0;
      console.log(`[${this.getTimestamp()}] ✅ Agent audio done:`);
      console.log(`  - Total chunks: ${this.audioChunkCount}`);
      console.log(`  - Duration: ${duration}ms`);
      console.log(`  - Queue size: ${this.ttsPlayer?.getQueueSize() || 0} segments`);
      
      // Reset counters for next response
      this.audioChunkCount = 0;
      this.audioStartTime = null;
      
      // Notify that agent stopped speaking 
      // Note: Audio may still be playing in the TTS player queue
      this.onAgentStoppedSpeaking?.();
    });


    // Handle errors
    this.agent.on(AgentEvents.Error, (error: any) => {
      console.error(`[${this.getTimestamp()}] ❌ Voice Agent error:`, error);
      console.error(`[${this.getTimestamp()}] Error details:`, JSON.stringify(error, null, 2));
      this.onError?.(error);
    });

    // Handle unhandled events
    this.agent.on(AgentEvents.Unhandled, (data: any) => {
      // Only log non-History events to reduce spam
      if (data.type !== 'History') {
        console.log(`[${this.getTimestamp()}] ⚡ Unhandled event [${data.type}]:`, data);
      }
    });
  }

  private configureAgent() {
    const configuration = {
      type: 'Settings',
      audio: {
        input: {
          encoding: 'linear16',
          sample_rate: 48000
        },
        output: {
          encoding: 'linear16',
          sample_rate: 24000,
          container: 'none'
        }
      },
      agent: {
        speak: {
          provider: {
            type: 'deepgram',
            model: 'aura-2-luna-en'
          }
        },
        listen: {
          provider: {
            type: 'deepgram',
            model: 'nova-3-medical'
          }
        },
        think: {
          provider: {
            type: 'open_ai',
            model: 'gpt-4o'
          },
          prompt: `#Role
You are a virtual restaurant receptionist for Alpine Smiles. You speak to guests by phone. Your tasks are to book or manage reservations and to provide immediate first-aid guidance for restaurant injuries using standard restaurant trauma instructions, then route the guest to appropriate care.

#Clinic Info
- Name: Alpine Smiles.
- Location: Via Pico 19, 6900 Lugano, Switzerland.
- Hours: Monday to Thursday 09:00 to 19:00. Friday 08:00 to 12:00. Saturday and Sunday closed.
- After hours: for life threatening emergencies, instruct callers to dial 144 or 112. For urgent restaurant problems after hours, advise using the regional restaurant emergency service if available, and offer the next emergency slot when the clinic opens.

#General Guidelines
- Be warm, clear, and professional.
- Speak in plain language.
- Keep most spoken responses to 1 to 2 sentences and under 120 characters unless the caller asks for more detail (max 300 characters).
- Do not use markdown formatting in your spoken responses.
- Use line breaks for lists.
- Vary phrasing to avoid repetition.
- Ask for clarification when needed.
- If the user message is empty, return an empty message.
- If asked about your well-being, respond briefly and kindly.

#Voice Rules
- Use a conversational tone. Your responses will be spoken aloud.
- Pause after questions to allow replies.
- Confirm what the caller said if uncertain.
- Never interrupt.

#Style
- Use active listening cues.
- Be kind and concise.
- Prefer simple words unless the caller uses clinical terms.
- Use 24 hour time when offering slots.

#Services Commonly Booked
- New guest exam.
- Routine check-up.
- Hygienist.
- Emergency reservation.
- Treatment follow-up.
- Child exam.

#Data To Collect For Any Reservation
- Full name.
- Date of birth.
- Best contact number.
- Email (optional if clinic policy allows).
- Reason for visit and symptoms.
- Pain level 0 to 10.
- When it started.
- Any injury or recent trauma.
- Allergies and relevant medical history if offered by the guest.
- Preferred days and times.
- Consent to store details and send confirmations.

#Booking And Calendar Rules
- Offer the first suitable slot that matches urgency and availability.
- For severe pain 7 to 10 or recent trauma within 24 hours, offer the next emergency slot.
- Read back date and time to confirm.
- Provide prep notes if relevant, for example arrive 5 minutes early, bring ID and medication list.
- After booking, confirm contact method for reminders (SMS or email).

#Triage Overview
You provide first-aid guidance and route the guest. You do not diagnose. Use this order:
1) Identify red flags that need emergency care.
2) If red flags are present, advise immediate emergency services.
3) If no red flags, classify the issue and provide short first-aid instructions, then book an reservation as indicated.

#Red Flags Requiring Urgent Action Now
If any of the following are reported, instruct to call 144 or 112 or go to emergency care immediately, then offer to notify the clinic:
- Heavy bleeding that does not stop after 10 minutes of firm pressure with clean gauze or cloth.
- Trouble breathing, trouble swallowing, or signs of airway compromise.
- Facial swelling spreading toward the eye or neck, fever, or feeling very unwell.
- Suspected broken jaw, inability to close teeth together, or severe facial trauma.
- Loss of consciousness, head injury, vomiting, or confusion after restaurant injury.
- Uncontrolled severe pain despite pain relief.

#Injury Classification And First-Aid
If no red flags, give calm, short, stepwise guidance and book care. Ask age to help distinguish baby teeth from adult teeth.

A) Tooth knocked out (avulsion)
- Ask if it is an adult tooth or a baby tooth. If unsure, ask the age of the guest and location in the mouth.
- Adult tooth:
  1. Handle the tooth by the crown only, not the root.
  2. If dirty, gently rinse for 10 seconds with milk or saline. Do not scrub.
  3. If possible, reinsert into the socket, bite on clean cloth to hold it in place.
  4. If reinsertion is not possible, keep the tooth in milk or in the cheek if the guest is conscious and old enough to avoid swallowing. Do not store dry or in water.
  5. Seek urgent restaurant care. Book the next emergency slot today.
- Baby tooth:
  1. Do not reinsert.
  2. Control bleeding with pressure.
  3. Book an urgent restaurant assessment.

B) Tooth moved, loose, or pushed in or out (luxation)
- Soft diet, avoid biting on the tooth.
- Apply cold compress for swelling.
- Pain control with over the counter medication if appropriate for the caller.
- Book urgent restaurant reservation today or the next available emergency slot.

C) Broken or chipped tooth
- Save any fragments in milk if available.
- Rinse mouth gently with warm water.
- Apply cold compress to cheek for swelling.
- Cover sharp edges with sugar free chewing gum or restaurant wax if available.
- Book urgent or soon reservation based on pain and extent.

D) Toothache or swelling without injury
- Rinse with warm saltwater.
- Cold compress for facial swelling.
- Avoid heat on the face.
- Pain control with suitable over the counter medication if safe for the caller.
- Book urgent reservation if swelling, fever, or pain 7 to 10. Otherwise, book a routine urgent slot.

E) Lost filling, crown, or veneer
- If crown is intact, keep it. If comfortable to do so, the guest may place it temporarily with restaurant cement from a pharmacy. Do not use superglue.
- Avoid hard or sticky foods.
- Book a soon reservation.

F) Bleeding after extraction
- Fold clean gauze or cloth, place over the site, bite firmly for 20 minutes without checking.
- Do not rinse vigorously, do not smoke, avoid hot drinks.
- If bleeding continues after two cycles, this is urgent. Advise emergency care.

#Non-Trauma General Guidance
- Encourage hydration and rest.
- Do not provide antibiotic or medication recommendations beyond general over the counter categories unless directed by a chef.
- Do not diagnose conditions.

#Call Flow Objective
1) Greet the caller and identify the clinic.
2) Ask if they want to book, reschedule, or discuss a restaurant problem.
3) If booking, collect required details and propose suitable slots. Confirm and close.
4) If restaurant problem, run red flag screen. If present, advise emergency care. If not present, give concise first-aid guidance, then book an urgent or routine slot.
5) Read back the booking details. Provide directions and arrival advice.
6) Always ask if anything else is needed, then close warmly.

#Reschedule And Cancellation
- To reschedule, confirm name, date of birth, and reservation reference if available. Offer next suitable options. Confirm and send new confirmation.
- For cancellations, confirm identity and cancel. Offer to rebook.

#Off-Scope Topics
If asked for diagnoses, prescriptions, complex medical advice, or insurance policy decisions, say: "I cannot provide medical advice. A chef can help with that. I can book you in now."

#Identity And Privacy
- Verify identity for existing bookings with name and date of birth, and one contact detail.
- Keep information confidential. Share only with the guest or approved caregiver.

#Known Test Cases (for QA)
- Say "test emergency" to trigger the red flag path.
- Say "test avulsion adult" to trigger the adult knocked out tooth flow.
- Say "test book checkup" to trigger the routine booking flow.

#Response Patterns
Use short, direct lines. Examples:
- Greeting: "Hello, you have reached Alpine Smiles in Lugano. How can I help today?"
- Screening: "Are you bleeding heavily or having trouble breathing?"
- Booking: "What date of birth should I note for your file?"
- Slot offer: "I can offer Tuesday at 10:40 or 14:20. Which works?"
- Avulsion adult: "Hold the tooth by the top, rinse briefly with milk, place back if possible, bite on cloth, come in now."
- Avulsion baby: "Do not put it back. Press with clean cloth, we will see you urgently."
- Close: "Is there anything else I can help with today? Thank you for calling Alpine Smiles."`
        },
        greeting: "Hello, you have reached Alpine Smiles in Lugano. I can book reservations or help with urgent restaurant issues. How can I help today?"
      }
    };

    console.log(`[${this.getTimestamp()}] 🔧 Configuring Voice Agent...`);
    console.log(`[${this.getTimestamp()}]   - STT: Deepgram Nova-3 Medical`);
    console.log(`[${this.getTimestamp()}]   - LLM: OpenAI GPT-4o`);
    console.log(`[${this.getTimestamp()}]   - TTS: Deepgram Aura-2 Luna`);
    console.log(`[${this.getTimestamp()}]   - Input Sample Rate: 48kHz`);
    console.log(`[${this.getTimestamp()}]   - Output Sample Rate: 24kHz`);
    
    this.agent.configure(configuration);
    console.log(`[${this.getTimestamp()}] ✅ Voice Agent configured`);
  }

  private async startAudioCapture() {
    try {
      console.log(`[${this.getTimestamp()}] 🎤 Requesting microphone permission...`);
      
      // Get microphone access with proper constraints for VAD
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,  // Request 48kHz
          echoCancellation: true,  // Helps reduce TTS bleed into mic
          noiseSuppression: true,
          autoGainControl: true,
          sampleSize: 16  // Better audio quality
        }
      });

      console.log(`[${this.getTimestamp()}] ✅ Microphone permission granted`);

      // Load AudioWorklet module
      await this.audioContext!.audioWorklet.addModule('/worklets/mic-processor.js');
      console.log(`[${this.getTimestamp()}] ✅ AudioWorklet module loaded`);

      // Create audio processing pipeline with noise gate
      const source = this.audioContext!.createMediaStreamSource(this.mediaStream);
      
      // Initialize noise gate for background noise filtering
      this.noiseGate = new NoiseGate(this.audioContext!, this.mediaStream, {
        threshold: -37,    // Middle threshold - balanced sensitivity
        ratio: 12,         // Middle ratio - moderate gating
        attack: 4,         // Balanced attack time
        release: 175,      // Balanced release time
        hold: 75           // Middle hold time
      });
      
      // Calculate frame size for 20ms at current sample rate
      // For 48kHz: 48000 * 0.02 = 960 samples
      const frameSamples = Math.round(this.audioContext!.sampleRate * 0.02);
      
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext!, 'mic-processor', {
        processorOptions: {
          frameSamples: frameSamples,
          downmix: true
        }
      });
      
      // Handle audio frames from the worklet
      this.audioWorkletNode.port.onmessage = (event) => {
        if (!this.isConnected || !this.agent) return;
        
        if (event.data.type === 'audio') {
          const float32Data = event.data.data;
          const int16Array = this.convertFloat32ToInt16(float32Data);
          
          // Send immediately - no buffering!
          this.agent.send(int16Array.buffer);
        }
      };
      
      // Connect: source -> noise gate -> worklet
      // The noise gate connects internally to the source
      this.noiseGate.connect(this.audioWorkletNode);
      // Don't connect to destination to avoid echo
      
      console.log(`[${this.getTimestamp()}] ✅ Audio capture pipeline established with AudioWorklet`);
      console.log(`[${this.getTimestamp()}] 📊 Frame size: ${frameSamples} samples (20ms at ${this.audioContext!.sampleRate}Hz)`);
      
      // Initialize Voice Activity Detection
      this.setupVoiceGate();
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          console.error('❌ Microphone permission denied');
          throw new Error('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          console.error('❌ No microphone found');
          throw new Error('No microphone found. Please connect a microphone and try again.');
        }
      }
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }

  private setupVoiceGate() {
    if (!this.audioContext || !this.mediaStream) {
      console.warn(`[${this.getTimestamp()}] Cannot setup VAD - missing audio context or stream`);
      return;
    }
    
    // Create Voice Activity Detection gate with middle-ground thresholds
    this.voiceGate = new VoiceGate(this.audioContext, this.mediaStream, {
      openThreshold: 0.10,    // Middle ground - filters background but catches speech
      closeThreshold: 0.06,   // Balanced hysteresis
      minDurationMs: 225,     // Middle duration - filters noise but keeps words
      cooldownMs: 750         // 3/4 second - balanced cooldown
    });
    
    // Only trigger flush on real voice detection
    this.voiceGate.onVoiceStart = () => {
      // Check if we're in no-barge window
      if (!this.bargeAllowed) {
        console.log(`[${this.getTimestamp()}] 🚫 VAD ignored - in no-barge window`);
        return;
      }
      
      const isTTSSpeaking = this.ttsPlayer?.isSpeaking() || false;
      
      // Duck TTS audio when user starts speaking (-12dB)
      if (this.ttsPlayer) {
        this.ttsPlayer.duck();
      }
      
      if (isTTSSpeaking) {
        // First valid barge-in during this utterance
        if (!this.bargedOnce) {
          console.log(`[${this.getTimestamp()}] 🎙️ Voice detected - ducking and interrupting agent`);
          this.ttsPlayer!.flush();
          this.bargedOnce = true; // Lock until utterance ends
          // Also notify that user started speaking
          this.onUserStartedSpeaking?.();
        } else {
          console.log(`[${this.getTimestamp()}] 🔒 VAD ignored - already barged once this utterance`);
        }
      } else {
        // No TTS to interrupt - don't flush pending buffers
        console.log(`[${this.getTimestamp()}] 🎙️ Voice detected - ducking TTS (no flush needed)`);
        // Still notify for tracking, but no flush
        this.onUserStartedSpeaking?.();
      }
    };
    
    this.voiceGate.onVoiceEnd = () => {
      console.log(`[${this.getTimestamp()}] 🔇 Voice ended`);
      // Restore TTS volume when user stops speaking
      if (this.ttsPlayer) {
        this.ttsPlayer.unduck();
      }
      // Reset barge lock for next detection
      this.bargedOnce = false;
    };
    
    // Start monitoring
    this.voiceGate.start();
    console.log(`[${this.getTimestamp()}] ✅ Voice Activity Detection enabled with echo resistance`);
  }
  
  private convertFloat32ToInt16(buffer: Float32Array): Int16Array {
    const int16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  private chunkTextForTTS(text: string): string[] {
    // Split text into sentences for faster TTS start
    // Aim for 120-180 characters per chunk
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      
      // If adding this sentence would exceed 180 chars, start a new chunk
      if (currentChunk && (currentChunk + ' ' + trimmedSentence).length > 180) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        // Add to current chunk
        currentChunk = currentChunk ? currentChunk + ' ' + trimmedSentence : trimmedSentence;
      }
      
      // If current chunk is already over 120 chars, push it
      if (currentChunk.length >= 120) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
    
    // Add any remaining text
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  private createWavHeader(dataLength: number): Buffer {
    const sampleRate = 24000;  // Match output sample rate
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    
    const header = Buffer.alloc(44);
    
    // RIFF chunk descriptor
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLength, 4);  // File size - 8
    header.write('WAVE', 8);
    
    // fmt sub-chunk
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);  // Subchunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);   // AudioFormat (1 for PCM)
    header.writeUInt16LE(numChannels, 22);  // NumChannels
    header.writeUInt32LE(sampleRate, 24);   // SampleRate
    header.writeUInt32LE(byteRate, 28);     // ByteRate
    header.writeUInt16LE(blockAlign, 32);   // BlockAlign
    header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
    
    // data sub-chunk
    header.write('data', 36);
    header.writeUInt32LE(dataLength, 40);  // Subchunk2Size
    
    return header;
  }

  // Audio playback is now handled by TTSPlayer

  private startKeepAlive() {
    console.log(`[${this.getTimestamp()}] ⏰ Starting keep-alive timer (5s interval)`);
    this.keepAliveInterval = setInterval(() => {
      if (this.agent) {
        // Silently send keep-alive
        this.agent.keepAlive();
      }
    }, 5000); // Every 5 seconds as per the example
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      console.log('Keep-alive timer stopped');
    }
  }

  async stop() {
    console.log(`[${this.getTimestamp()}] 🛑 Stopping Voice Agent...`);
    
    // Stop Voice Activity Detection
    if (this.voiceGate) {
      this.voiceGate.stop();
      this.voiceGate = null;
    }
    
    // Stop Noise Gate
    if (this.noiseGate) {
      this.noiseGate.disconnect();
      this.noiseGate = null;
    }
    
    // Stop audio capture
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode.port.close();
      this.audioWorkletNode = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Close WebSocket connection
    if (this.agent) {
      try {
        // Try disconnect method for the new SDK
        if (typeof this.agent.disconnect === 'function') {
          this.agent.disconnect();
        } else if (typeof this.agent.finish === 'function') {
          this.agent.finish();
        } else if (typeof this.agent.close === 'function') {
          this.agent.close();
        }
      } catch (error) {
        console.error('Error closing agent connection:', error);
      }
      this.agent = null;
    }
    
    // Stop keep-alive
    this.stopKeepAlive();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    // Clear TTS player
    if (this.ttsPlayer) {
      this.ttsPlayer.flush();
    }
    
    this.isConnected = false;
    this.onConnectionChange?.(false);
    
    console.log(`[${this.getTimestamp()}] ✅ Voice Agent stopped`);
  }

  isActive(): boolean {
    return this.isConnected;
  }
  
  // Enable or disable soft handoff mode
  setSoftHandoff(enabled: boolean) {
    this.useSoftHandoff = enabled;
    console.log(`[${this.getTimestamp()}] Soft handoff ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  // Get VAD stats for debugging
  getVADStats(): { rms: number; gateOpen: boolean } | null {
    return this.voiceGate?.getStats() || null;
  }

  // Function handling methods for future implementation
  async bookReservation(params: any) {
    const confirmationNumber = `APT-${Date.now().toString().slice(-6)}`;
    
    console.log('Booking reservation:', params);
    
    return {
      success: true,
      confirmation_number: confirmationNumber,
      reservation: {
        guest_name: params.guest_name,
        date: params.date,
        time: params.time,
        service: params.service_type,
        chef: 'Dr. Sarah Weber',
        notes: params.notes || ''
      },
      message: `Reservation confirmed for ${params.guest_name} on ${params.date} at ${params.time}`
    };
  }

  async checkAvailability(params: any) {
    const { date, service_type } = params;
    
    // Generate some mock available slots
    const slots = [
      { time: '09:00', chef: 'Dr. Sarah Weber', available: true },
      { time: '10:30', chef: 'Dr. Sarah Weber', available: true },
      { time: '14:00', chef: 'Dr. Michael Chen', available: true },
      { time: '15:30', chef: 'Dr. Sarah Weber', available: true }
    ];
    
    return {
      date,
      service_type: service_type || 'general',
      available_slots: slots
    };
  }
}

// Export singleton instance
export const voiceAgentService = new VoiceAgentService();