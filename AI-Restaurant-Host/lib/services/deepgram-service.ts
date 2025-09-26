import { createClient, LiveTranscriptionEvents, DeepgramClient, LiveClient } from '@deepgram/sdk';

class DeepgramService {
  private client: DeepgramClient | null = null;
  private connection: LiveClient | null = null;
  private isListening: boolean = false;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  initialize(): void {
    // In Next.js client-side code, environment variables are replaced at build time
    // For development, ensure you restart the dev server after adding .env.local
    const apiKey = typeof window !== 'undefined' 
      ? process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY 
      : process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      
    console.log('Initializing Deepgram with API key:', apiKey ? 'Present' : 'Missing');
    
    if (!apiKey || apiKey === 'undefined') {
      console.error('Deepgram API key is not configured. Please add NEXT_PUBLIC_DEEPGRAM_API_KEY to your .env.local file and restart the dev server.');
      throw new Error('Deepgram API key is not configured');
    }
    
    this.client = createClient(apiKey);
    console.log('Deepgram client created successfully');
  }

  async startTranscription(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError?: (error: any) => void
  ): Promise<LiveClient | null> {
    try {
      console.log('Starting Deepgram transcription...');
      
      if (!this.client) {
        this.initialize();
      }

      if (!this.client) {
        throw new Error('Failed to initialize Deepgram client');
      }

      // Create WebSocket connection for live transcription
      this.connection = this.client.listen.live({
        model: 'nova-2',
        language: 'en-US',
        punctuate: true,
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1
      });

      console.log('Deepgram connection created, setting up event handlers...');

      // Handle connection open
      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram WebSocket connection opened successfully');
        this.isListening = true;
        
        // Keep connection alive
        this.keepAliveInterval = setInterval(() => {
          if (this.connection && this.isListening) {
            console.log('Sending keep-alive ping to Deepgram');
            this.connection.keepAlive();
          }
        }, 10000);
      });

      // Handle transcription results
      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        console.log('Deepgram Results event received:', data);
        
        if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
          const transcript = data.channel.alternatives[0].transcript;
          
          if (transcript) {
            console.log(`📝 Transcript: "${transcript}" (Final: ${data.is_final})`);
            onTranscript(transcript, data.is_final);
          }
        }
      });

      // Handle other events for debugging
      this.connection.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        console.log('Deepgram Metadata received:', data);
      });

      this.connection.on(LiveTranscriptionEvents.UtteranceEnd, (data: any) => {
        console.log('Deepgram UtteranceEnd event:', data);
      });

      // Handle errors
      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('❌ Deepgram error:', error);
        if (onError) onError(error);
      });

      // Handle connection close
      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram WebSocket connection closed');
        this.isListening = false;
        if (this.keepAliveInterval) {
          clearInterval(this.keepAliveInterval);
          this.keepAliveInterval = null;
        }
      });

      return this.connection;
    } catch (error) {
      console.error('❌ Failed to start transcription:', error);
      throw error;
    }
  }

  async textToSpeech(text: string, voice: string = 'aura-asteria-en'): Promise<string> {
    try {
      console.log(`🔊 Requesting TTS for: "${text.substring(0, 50)}..." with voice: ${voice}`);

      // Call Next.js API route for TTS
      const response = await fetch('/api/deepgram/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, voice })
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.statusText}`);
      }

      // Get the JSON response containing the audio URL
      const data = await response.json();
      
      // Handle fallback to browser TTS
      if (data.fallback || data.audioUrl === 'browser-tts') {
        console.log('API indicated browser TTS fallback');
        return this.browserTTS(text);
      }
      
      // The API returns a base64 data URL or audio URL
      const audioUrl = data.audioUrl;
      
      console.log(`✅ Speech generated successfully with ${data.voice || voice}`);
      
      return audioUrl;
    } catch (error) {
      console.error('❌ TTS backend error:', error);
      console.log('Falling back to browser TTS');
      return this.browserTTS(text);
    }
  }

  private browserTTS(text: string): Promise<string> {
    return new Promise((resolve) => {
      console.log('Using browser speech synthesis as fallback');
      
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices
      let voices = speechSynthesis.getVoices();
      
      // If voices aren't loaded yet, wait for them
      if (voices.length === 0) {
        speechSynthesis.addEventListener('voiceschanged', () => {
          voices = speechSynthesis.getVoices();
          this.setFemaleVoice(utterance, voices);
        }, { once: true });
      } else {
        this.setFemaleVoice(utterance, voices);
      }
      
      utterance.rate = 1.0;
      utterance.pitch = 1.2; // Slightly higher pitch for more feminine sound
      utterance.volume = 1.0;
      
      speechSynthesis.speak(utterance);
      
      // Return a dummy URL for browser TTS
      resolve('browser-tts');
    });
  }

  private setFemaleVoice(utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]): void {
    console.log('Available voices:', voices.map(v => v.name));
    
    // Priority list of female voice names to search for
    const femaleVoiceKeywords = [
      // Windows voices
      'Microsoft Zira',
      'Microsoft Hazel',
      'Zira',
      'Hazel',
      // Google voices
      'Google UK English Female',
      'Google US English Female',
      // Generic female indicators
      'Female', 'female',
      'Woman', 'woman',
      // Common female names
      'Samantha', 'Victoria', 'Kate', 'Allison', 'Ava', 'Susan',
      'Karen', 'Linda', 'Emma', 'Amy', 'Mary',
      // UK English
      'UK English',
      'British English'
    ];
    
    // Find the best female voice
    let selectedVoice: SpeechSynthesisVoice | null = null;
    
    for (const keyword of femaleVoiceKeywords) {
      selectedVoice = voices.find(voice => 
        voice.name.includes(keyword) && voice.lang.startsWith('en')
      ) || null;
      if (selectedVoice) {
        console.log(`✅ Found female voice: ${selectedVoice.name}`);
        break;
      }
    }
    
    // If no female voice found, try to avoid male voices
    if (!selectedVoice) {
      const maleKeywords = ['David', 'Mark', 'Richard', 'George', 'James', 'Male', 'male'];
      selectedVoice = voices.find(voice => 
        voice.lang.startsWith('en-US') && 
        !maleKeywords.some(keyword => voice.name.includes(keyword))
      ) || 
      voices.find(voice => 
        voice.lang.startsWith('en') &&
        !maleKeywords.some(keyword => voice.name.includes(keyword))
      ) ||
      voices[0];
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(`Selected voice: ${selectedVoice.name}`);
    }
  }

  stopTranscription(): void {
    console.log('Stopping Deepgram transcription...');
    
    if (this.connection) {
      this.connection.finish();
      this.connection = null;
      this.isListening = false;
    }
    
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  sendAudio(audioData: ArrayBuffer | Buffer): void {
    if (this.connection && this.isListening) {
      try {
        const byteLength = audioData.byteLength;
        
        if (byteLength > 0) {
          console.log(`🎤 Sending ${byteLength} bytes of audio data to Deepgram`);
          // Convert Buffer to ArrayBuffer if necessary for type compatibility
          const dataToSend = audioData instanceof ArrayBuffer ? audioData : audioData as any;
          this.connection.send(dataToSend);
        }
      } catch (error) {
        console.error('❌ Error sending audio:', error);
      }
    } else {
      console.warn('Cannot send audio: connection not ready or not listening');
    }
  }
}

export const deepgramService = new DeepgramService();