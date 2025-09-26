// Voice Activity Detection (VAD) gate to prevent accirestaurant interruptions
export class VoiceGate {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private src: MediaStreamAudioSourceNode;
  private buf: Float32Array;
  private gateOpen: boolean = false;
  private lastOpenTs: number = 0;
  private animationId: number | null = null;
  private boosted: boolean = false;      // Boosted mode for echo resistance
  private noBargeUntil: number = 0;      // No-barge window timestamp
  
  // Base thresholds
  private baseOpenThresh: number = 0.03;     // RMS to open gate (0.02-0.05)
  private baseCloseThresh: number = 0.015;   // RMS to close gate (hysteresis)
  private baseMinOpenMs: number = 120;       // Must exceed threshold this long
  private baseCooldownMs: number = 400;      // Prevent rapid re-triggers
  
  // Callback when voice is detected
  public onVoiceStart: (() => void) | null = null;
  public onVoiceEnd: (() => void) | null = null;
  
  constructor(ctx: AudioContext, stream: MediaStream, options?: {
    openThreshold?: number;
    closeThreshold?: number;
    minDurationMs?: number;
    cooldownMs?: number;
  }) {
    this.ctx = ctx;
    
    // Apply custom thresholds if provided
    if (options?.openThreshold) this.baseOpenThresh = options.openThreshold;
    if (options?.closeThreshold) this.baseCloseThresh = options.closeThreshold;
    if (options?.minDurationMs) this.baseMinOpenMs = options.minDurationMs;
    if (options?.cooldownMs) this.baseCooldownMs = options.cooldownMs;
    
    // Create audio processing chain
    this.src = ctx.createMediaStreamSource(stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024; // ~21ms at 48kHz
    this.analyser.smoothingTimeConstant = 0.2; // Some smoothing to reduce jitter
    
    // Connect source to analyser (but not to destination - we just analyze)
    this.src.connect(this.analyser);
    
    // Buffer for time domain data
    this.buf = new Float32Array(this.analyser.fftSize);
    
    console.log(`[VoiceGate] Initialized with thresholds: open=${this.baseOpenThresh}, close=${this.baseCloseThresh}, minDuration=${this.baseMinOpenMs}ms`);
  }
  
  // Dynamic threshold getters based on boost state
  private get openThresh(): number {
    return this.boosted ? this.baseOpenThresh * 2.5 : this.baseOpenThresh;
  }
  
  private get closeThresh(): number {
    return this.boosted ? this.baseCloseThresh * 2.0 : this.baseCloseThresh;
  }
  
  private get minOpenMs(): number {
    return this.boosted ? Math.max(this.baseMinOpenMs, 280) : this.baseMinOpenMs;
  }
  
  private get cooldownMs(): number {
    return this.boosted ? Math.max(this.baseCooldownMs, 700) : this.baseCooldownMs;
  }
  
  // Set boosted mode (for when TTS is playing)
  public setBoosted(boosted: boolean, noBargeWindowMs: number = 300) {
    const wasBoosted = this.boosted;
    this.boosted = boosted;
    
    if (boosted && !wasBoosted) {
      // Entering boosted mode - set no-barge window
      this.noBargeUntil = performance.now() + noBargeWindowMs;
      console.log(`[VoiceGate] Boosted mode ON (thresholds: open=${this.openThresh.toFixed(3)}, minDuration=${this.minOpenMs}ms)`);
    } else if (!boosted && wasBoosted) {
      console.log(`[VoiceGate] Boosted mode OFF (normal sensitivity restored)`);
    }
  }
  
  public start() {
    if (this.animationId !== null) {
      console.warn('[VoiceGate] Already started');
      return;
    }
    
    const loop = () => {
      // Get time domain data
      this.analyser.getFloatTimeDomainData(this.buf);
      
      // Calculate RMS (Root Mean Square) for volume level
      let sum = 0;
      for (let i = 0; i < this.buf.length; i++) {
        sum += this.buf[i] * this.buf[i];
      }
      const rms = Math.sqrt(sum / this.buf.length);
      
      const now = performance.now();
      
      if (!this.gateOpen) {
        // Check if we're in no-barge window
        if (now < this.noBargeUntil) {
          // Skip VAD during no-barge window
          this.lastOpenTs = 0;
        } else if (rms >= this.openThresh) {
          // Above threshold
          if (!this.lastOpenTs) {
            // Start timing
            this.lastOpenTs = now;
          } else if (now - this.lastOpenTs >= this.minOpenMs) {
            // Threshold exceeded for minimum duration - open gate
            this.gateOpen = true;
            this.lastOpenTs = now + this.cooldownMs; // Apply cooldown immediately
            console.log(`[VoiceGate] Voice detected (RMS: ${rms.toFixed(4)})`);
            if (this.onVoiceStart) {
              this.onVoiceStart();
            }
          }
        } else {
          // Below threshold - reset timer
          this.lastOpenTs = 0;
        }
      } else {
        // Gate is open - check if we should close it
        if (rms < this.closeThresh) {
          // Below close threshold - close gate
          this.gateOpen = false;
          // Set cooldown to prevent immediate re-trigger
          this.lastOpenTs = now + this.cooldownMs;
          console.log(`[VoiceGate] Voice ended (RMS: ${rms.toFixed(4)})`);
          if (this.onVoiceEnd) {
            this.onVoiceEnd();
          }
        }
      }
      
      // Continue loop
      this.animationId = requestAnimationFrame(loop);
    };
    
    // Start the loop
    loop();
    console.log('[VoiceGate] Started monitoring');
  }
  
  public stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      console.log('[VoiceGate] Stopped monitoring');
    }
    
    // Disconnect audio nodes
    try {
      this.src.disconnect();
      this.analyser.disconnect();
    } catch (e) {
      // Already disconnected
    }
  }
  
  public isGateOpen(): boolean {
    return this.gateOpen;
  }
  
  public setThresholds(open: number, close: number) {
    this.baseOpenThresh = open;
    this.baseCloseThresh = close;
    console.log(`[VoiceGate] Updated base thresholds: open=${open}, close=${close}`);
  }
  
  public getStats(): { rms: number; gateOpen: boolean } {
    // Get current RMS for debugging/tuning
    this.analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) {
      sum += this.buf[i] * this.buf[i];
    }
    const rms = Math.sqrt(sum / this.buf.length);
    
    return {
      rms,
      gateOpen: this.gateOpen
    };
  }
}