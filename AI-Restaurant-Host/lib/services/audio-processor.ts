export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private audioLevel: number = 0;
  private frequency: number = 0;
  private smoothedLevel: number = 0;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async initialize(stream: MediaStream): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect microphone stream
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      // Initialize data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio processor:', error);
    }
  }

  getAudioData(): {
    level: number;
    frequency: number;
    frequencyData: Uint8Array | null;
    peakDetected: boolean;
  } {
    if (!this.analyser || !this.dataArray || !this.isInitialized) {
      return {
        level: 0,
        frequency: 0,
        frequencyData: null,
        peakDetected: false
      };
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate RMS (Root Mean Square) for overall volume
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i] * this.dataArray[i];
    }
    const rms = Math.sqrt(sum / this.dataArray.length);
    this.audioLevel = Math.min(1, rms / 128); // Normalize to 0-1

    // Apply smoothing
    this.smoothedLevel = this.smoothedLevel * 0.7 + this.audioLevel * 0.3;

    // Find dominant frequency
    let maxValue = 0;
    let maxIndex = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      if (this.dataArray[i] > maxValue) {
        maxValue = this.dataArray[i];
        maxIndex = i;
      }
    }

    // Convert index to frequency (approximate)
    const nyquist = this.audioContext!.sampleRate / 2;
    this.frequency = (maxIndex / this.dataArray.length) * nyquist;

    // Detect peaks
    const peakDetected = this.audioLevel > 0.7 && this.audioLevel > this.smoothedLevel * 1.3;

    return {
      level: this.smoothedLevel,
      frequency: this.frequency / 1000, // Convert to kHz
      frequencyData: this.dataArray,
      peakDetected
    };
  }

  // Get audio level from an audio element (for agent speech)
  connectToAudioElement(audioElement: HTMLAudioElement): void {
    if (!this.audioContext) return;

    try {
      const source = this.audioContext.createMediaElementSource(audioElement);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      source.connect(this.audioContext.destination);
      
      // Store for agent audio analysis
      this.analyser = analyser;
      this.dataArray = new Uint8Array(analyser.frequencyBinCount);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to connect audio element:', error);
    }
  }

  // Clean up resources
  disconnect(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    this.dataArray = null;
    this.isInitialized = false;
  }

  // Get smooth transitions for animations
  getSmoothAudioLevel(): number {
    return this.smoothedLevel;
  }

  // Check if audio is above threshold
  isActive(threshold: number = 0.1): boolean {
    return this.audioLevel > threshold;
  }

  // Get frequency range analysis
  getFrequencyRanges(): {
    bass: number;
    mid: number;
    treble: number;
  } {
    if (!this.dataArray) {
      return { bass: 0, mid: 0, treble: 0 };
    }

    const third = Math.floor(this.dataArray.length / 3);
    
    let bass = 0;
    let mid = 0;
    let treble = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const value = this.dataArray[i] / 255;
      if (i < third) {
        bass += value;
      } else if (i < third * 2) {
        mid += value;
      } else {
        treble += value;
      }
    }

    return {
      bass: bass / third,
      mid: mid / third,
      treble: treble / third
    };
  }
}

// Singleton instance
export const audioProcessor = new AudioProcessor();