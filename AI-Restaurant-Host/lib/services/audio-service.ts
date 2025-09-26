interface AudioServiceConfig {
  sampleRate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

type VolumeUpdateCallback = (volume: number) => void;
type AudioDataCallback = (audioData: ArrayBuffer) => void;

export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording: boolean = false;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private onVolumeUpdate: VolumeUpdateCallback | null = null;

  async initialize(config: AudioServiceConfig = {}): Promise<boolean> {
    try {
      console.log('🎤 Initializing audio service...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }
      
      // Request microphone access with minimal processing for cleaner VAD
      const defaultConfig = {
        echoCancellation: false,  // Disable for cleaner VAD detection
        noiseSuppression: false,  // Disable to avoid VAD artifacts
        autoGainControl: false,   // Disable to prevent false VAD triggers
        channelCount: 1,         // Mono for better processing
        sampleRate: 48000,       // 48kHz for optimal quality
        ...config
      };

      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: defaultConfig
        });
      } catch (initialError) {
        console.warn('Failed with 48kHz, trying default sample rate...', initialError);
        // Fallback to default sample rate if 48kHz is not supported
        const fallbackConfig: any = { ...defaultConfig };
        delete fallbackConfig.sampleRate;
        
        this.audioStream = await navigator.mediaDevices.getUserMedia({ 
          audio: fallbackConfig
        });
      }
      
      console.log('✅ Microphone access granted');
      console.log('Audio tracks:', this.audioStream.getAudioTracks());
      
      // Check if audio tracks are available and enabled
      const audioTracks = this.audioStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available');
      }
      
      audioTracks.forEach(track => {
        console.log(`Track: ${track.label}, Enabled: ${track.enabled}, Muted: ${track.muted}`);
        if (!track.enabled) {
          track.enabled = true;
        }
      });
      
      // Create audio context for processing
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000
        });
      } catch (contextError) {
        console.warn('Failed to create 16kHz context, using default...', contextError);
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      console.log('✅ Audio context created with sample rate:', this.audioContext.sampleRate);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize audio:', error);
      
      // Provide more specific error messages
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Microphone is in use by another application. Please close other apps using the microphone.');
        }
      }
      
      throw new Error('Microphone access error: ' + (error as Error).message);
    }
  }

  async startRecording(onDataAvailable: AudioDataCallback, onVolumeUpdate: VolumeUpdateCallback): Promise<void> {
    if (!this.audioStream) {
      throw new Error('Audio not initialized. Call initialize() first.');
    }

    console.log('🎙️ Starting audio recording with direct PCM streaming...');
    
    // Store the volume callback
    this.onVolumeUpdate = onVolumeUpdate;
    
    // Try AudioWorklet first, fallback to ScriptProcessor
    await this.startDirectPCMStreaming(onDataAvailable);
  }

  private async startDirectPCMStreaming(onDataAvailable: AudioDataCallback): Promise<void> {
    if (!this.audioContext || !this.audioStream) {
      throw new Error('Audio context or stream not available');
    }

    console.log('🎵 Starting AudioWorklet PCM streaming...');
    
    // Create source from stream
    this.source = this.audioContext.createMediaStreamSource(this.audioStream);
    
    // Create an analyser node for better volume detection
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    // Load the AudioWorklet module
    await this.audioContext.audioWorklet.addModule('/audio-worklet-processor.js');
    
    // Create AudioWorklet node
    const workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor');
    
    // Handle messages from the worklet
    workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audio') {
        // Received PCM audio data from worklet
        const int16Array = new Int16Array(event.data.buffer);
        onDataAvailable(int16Array.buffer);
      } else if (event.data.type === 'volume') {
        // Volume update for visualization
        this.onVolumeUpdate?.(event.data.level);
      }
    };
    
    // Connect audio graph: source -> analyser -> worklet -> destination
    this.source.connect(this.analyser);
    this.analyser.connect(workletNode);
    workletNode.connect(this.audioContext.destination);
    
    // Store reference for cleanup
    this.processor = workletNode as any;
    
    this.isRecording = true;
    console.log('✅ AudioWorklet PCM streaming active (modern, low-latency)');
  }

  stopRecording(): void {
    console.log('🛑 Stopping recording...');
    
    this.isRecording = false;
    
    if (this.processor) {
      this.processor.disconnect();
      
      // Clean up based on type
      if ('onaudioprocess' in this.processor) {
        // ScriptProcessor cleanup
        (this.processor as ScriptProcessorNode).onaudioprocess = null;
      } else if ('port' in this.processor) {
        // AudioWorklet cleanup
        (this.processor as AudioWorkletNode).port.onmessage = null;
      }
      
      this.processor = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    // Clear volume callback
    this.onVolumeUpdate = null;
    
    console.log('Recording stopped');
  }

  async playAudio(audioUrl: string): Promise<void> {
    try {
      // Handle browser TTS
      if (audioUrl === 'browser-tts' || !audioUrl) {
        console.log('Browser TTS playback (handled by speechSynthesis)');
        // Wait a bit for speech synthesis to complete
        return new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`🔊 Playing audio from URL: ${audioUrl.substring(0, 50)}...`);
      
      // Check if it's a data URL and extract the MIME type
      if (audioUrl.startsWith('data:')) {
        const mimeMatch = audioUrl.match(/data:([^;]+);/);
        if (mimeMatch) {
          console.log(`Audio MIME type: ${mimeMatch[1]}`);
        }
      }
      
      const audio = new Audio();
      audio.volume = 0.8;
      
      return new Promise((resolve, reject) => {
        let loadTimeout: NodeJS.Timeout;
        
        audio.onloadeddata = () => {
          console.log('✅ Audio data loaded');
          clearTimeout(loadTimeout);
        };
        
        audio.oncanplay = () => {
          console.log('✅ Audio can play');
          clearTimeout(loadTimeout);
        };
        
        audio.onended = () => {
          console.log('✅ Audio playback completed');
          if (audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
          }
          clearTimeout(loadTimeout);
          resolve();
        };
        
        audio.onerror = (event) => {
          console.error('❌ Audio playback error:', {
            error: event,
            audioUrl: audioUrl.substring(0, 100),
            readyState: audio.readyState,
            networkState: audio.networkState
          });
          
          clearTimeout(loadTimeout);
          
          if (audioUrl.startsWith('blob:')) {
            URL.revokeObjectURL(audioUrl);
          }
          
          // Don't reject, just resolve to continue
          console.log('Continuing despite audio error');
          resolve();
        };
        
        // Set source and attempt to play
        audio.src = audioUrl;
        
        // Add a timeout to prevent hanging
        loadTimeout = setTimeout(() => {
          console.warn('⚠️ Audio loading timeout, continuing...');
          resolve();
        }, 5000);
        
        audio.play()
          .then(() => {
            console.log('▶️ Audio playback started');
          })
          .catch((error) => {
            console.error('❌ Failed to play audio:', error.message || error);
            clearTimeout(loadTimeout);
            // Don't reject, just resolve to continue
            resolve();
          });
      });
    } catch (error) {
      console.error('❌ Error playing audio:', error);
      throw error;
    }
  }

  cleanup(): void {
    console.log('🧹 Cleaning up audio service...');
    
    this.stopRecording();
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.stop();
        console.log('Audio track stopped');
      });
      this.audioStream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
      console.log('Audio context closed');
    }
  }

  // Simulate phone ring
  async playRingtone(): Promise<void> {
    console.log('🔔 Playing ringtone...');
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 0.5;
    const frequency1 = 440;
    const frequency2 = 480;
    
    for (let i = 0; i < 2; i++) { // Reduced to 2 rings for faster startup
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.frequency.value = frequency1;
      oscillator2.frequency.value = frequency2;
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime); // Reduced volume
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + duration);
      oscillator2.stop(audioContext.currentTime + duration);
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('✅ Ringtone completed');
  }
}

// Create singleton instance
export const audioService = new AudioService();
export default audioService;