// Optimized TTS player with generation-based utterance control
export class TTSPlayer {
  private ctx: AudioContext;
  private nextTime: number = 0;
  private stash24k: Int16Array = new Int16Array(0);
  private playing: boolean = false;
  private queue: Int16Array[] = [];
  
  // Generation control for utterance scoping
  private currentGen: number = 0;
  private drainingGen: number = 0;
  private scheduled: Array<{ src: AudioBufferSourceNode; gen: number; startAt: number }> = [];
  private masterGain: GainNode;
  private duckingGain: GainNode;  // For VAD-triggered ducking
  private isDucked: boolean = false;
  
  // Soft switching for finish-the-sentence behavior
  private pendingGen: number = 0;
  private pendingQueue: Int16Array[] = [];
  private softSwitching: boolean = false;
  
  // Speaking state tracking (per generation to avoid cross-gen flicker)
  private speakingByGen: Map<number, number> = new Map();
  private onSpeakingChange?: (speaking: boolean) => void;
  private _smoothedRate: number = 1.0; // For gentle rate transitions
  
  // Backpressure management
  private readonly HI_WATER = 32;  // Start dropping at this level
  private readonly LO_WATER = 16;  // Resume accepting at this level
  private overwater: boolean = false;
  
  // Lead time management
  private lastLeadLogAt: number = 0;
  private lastWaterLogAt: number = 0;
  
  // Callbacks
  public onBackpressure?: (info: { level: 'high' | 'normal'; segments: number }) => void;
  
  // Configuration
  private readonly S_TTS = 24000;          // Deepgram TTS sample rate
  private LEAD_SEC = 0.12;                 // 120ms jitter buffer (increased for stability)
  private readonly TARGET_LEAD_SEC = 0.12; // Target jitter buffer for catch-up
  private readonly MAX_LEAD_SEC = 3.0;     // Maximum lead time to prevent over-buffering
  private readonly MIN_MS = 64;            // Coalesce small packets to 64ms minimum
  private readonly MAX_MS = 96;            // Maximum 96ms per buffer (reduced from 160ms)
  private readonly MAX_SEGMENTS = 48;      // Hard cap on queue size
  
  constructor(audioContext?: AudioContext) {
    // Use provided context or create new one with optimal settings
    this.ctx = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive',  // Optimize for low latency
      sampleRate: 48000  // 48kHz for optimal quality
    } as AudioContextOptions);
    console.log(`[TTSPlayer] Initialized with context rate: ${this.ctx.sampleRate}Hz`);
    
    // Create ducking gain node for VAD-triggered volume reduction
    this.duckingGain = this.ctx.createGain();
    this.duckingGain.gain.value = 1;
    
    // Create master gain node for fade control
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    
    // Chain: sources -> duckingGain -> masterGain -> destination
    this.duckingGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }
  
  private int16Concat(a: Int16Array, b: Int16Array): Int16Array {
    const out = new Int16Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }
  
  private int16ToF32(i16: Int16Array): Float32Array {
    const f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) {
      f32[i] = i16[i] / 0x8000;
    }
    return f32;
  }
  
  // Normalize various input views/buffers into an Int16Array without corrupting length
  private toInt16(data: ArrayBuffer | ArrayBufferView | Buffer): Int16Array {
    // Plain ArrayBuffer
    if (data instanceof ArrayBuffer) {
      return new Int16Array(data);
    }
    // TypedArray views (e.g., Int16Array, Uint8Array)
    if (ArrayBuffer.isView(data)) {
      if (data instanceof Int16Array) {
        return data;
      }
      return new Int16Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 2));
    }
    // Fallback for Buffer-like objects (Node.js) or unknown views
    const anyData: any = data as any;
    if (anyData && anyData.buffer) {
      const byteOffset = anyData.byteOffset ?? 0;
      const byteLength = anyData.byteLength ?? anyData.length ?? 0;
      return new Int16Array(anyData.buffer, byteOffset, Math.floor(byteLength / 2));
    }
    // Last resort - try to construct directly
    return new Int16Array(data as ArrayBuffer);
  }
  
  // Per-generation speaking state helpers
  private incSpeaking(gen: number) {
    const n = (this.speakingByGen.get(gen) ?? 0) + 1;
    this.speakingByGen.set(gen, n);
    if (this.currentGen === gen && n === 1) {
      this.onSpeakingChange?.(true);
    }
  }
  
  private decSpeaking(gen: number) {
    const n = Math.max(0, (this.speakingByGen.get(gen) ?? 0) - 1);
    this.speakingByGen.set(gen, n);
    if (this.currentGen === gen && n === 0) {
      this.onSpeakingChange?.(false);
    }
  }
  
  // Helper to purge future scheduled nodes (ONLY used for generation changes, not normal scheduling)
  private purgeFutureScheduled(fromTime: number) {
    // Only purge nodes from OLD generations, never current generation
    for (const s of [...this.scheduled]) {
      if (s.gen !== this.currentGen && s.startAt > fromTime) {
        try {
          // Avoid double onended bookkeeping when force-stopping
          try { s.src.onended = null; } catch {}
          s.src.stop();
        } catch (e) {
          // Already stopped
        }
        // Remove immediately
        const idx = this.scheduled.indexOf(s);
        if (idx >= 0) this.scheduled.splice(idx, 1);
        // Adjust speaking counter
        this.decSpeaking(s.gen);
      }
    }
  }
  
  // Simple linear resampler from 24kHz to context sample rate
  private resampleToCtx(f32_24k: Float32Array): Float32Array {
    if (this.ctx.sampleRate === this.S_TTS) {
      return f32_24k; // No resampling needed
    }
    
    const ratio = this.ctx.sampleRate / this.S_TTS;
    const out = new Float32Array(Math.round(f32_24k.length * ratio));
    
    for (let i = 0; i < out.length; i++) {
      const t = i / ratio;
      const i0 = Math.floor(t);
      const i1 = Math.min(i0 + 1, f32_24k.length - 1);
      const frac = t - i0;
      out[i] = f32_24k[i0] * (1 - frac) + f32_24k[i1] * frac;
    }
    
    return out;
  }
  
  private async scheduleF32(f32: Float32Array, gen: number) {
    // Don't schedule if this is from an old generation
    if (gen !== this.currentGen) return;
    
    // Pre-guard: wait if already too far ahead to prevent over-scheduling
    while ((this.nextTime - this.ctx.currentTime) > (this.TARGET_LEAD_SEC + 0.5)) {
      await new Promise(r => setTimeout(r, 4));
      // Check generation again after waiting
      if (gen !== this.currentGen) return;
    }
    
    const buf = this.ctx.createBuffer(1, f32.length, this.ctx.sampleRate);
    buf.copyToChannel(f32, 0, 0);
    
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.duckingGain);  // Connect to ducking gain instead of master
    
    // Calculate ideal start time
    const base = Math.max(
      this.ctx.currentTime + this.LEAD_SEC, 
      this.nextTime || this.ctx.currentTime + this.LEAD_SEC
    );
    
    const now = this.ctx.currentTime;
    let startAt = base;
    let lead = startAt - now;
    
    // Hard cap: if we're way over, pull back to target
    if (lead > this.MAX_LEAD_SEC) {
      startAt = now + this.TARGET_LEAD_SEC;
      
      // IMPORTANT: Purge any future-scheduled nodes to prevent overlap
      this.purgeFutureScheduled(now);
      
      // Debounced logging
      const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (t - this.lastLeadLogAt > 500) {
        console.warn(`[TTSPlayer] Lead capped (was: ${Math.round(lead * 1000)}ms, now: ${Math.round(this.TARGET_LEAD_SEC * 1000)}ms)`);
        this.lastLeadLogAt = t;
      }
      lead = this.TARGET_LEAD_SEC;
    }
    
    // Gentle catch-up: measure how far ahead we are from target
    const projectedLead = Math.max(0, (this.nextTime || now) - now);
    const over = projectedLead - this.TARGET_LEAD_SEC;
    
    // Apply minimal playback rate adjustment only when way ahead
    const targetRate = over > 0.5 ? 1.01 : 1.00;
    
    // Gentle smoothing to avoid audio chirps (0.35 factor)
    this._smoothedRate += (targetRate - this._smoothedRate) * 0.35;
    src.playbackRate.value = this._smoothedRate;
    
    src.start(startAt);
    this.nextTime = startAt + (buf.duration / src.playbackRate.value);
    
    // Track this scheduled source with its generation and start time
    this.scheduled.push({ src, gen, startAt });
    
    // Track speaking state (per generation)
    this.incSpeaking(gen);
    
    // Clean up when ended
    src.onended = () => {
      const idx = this.scheduled.findIndex(s => s.src === src);
      if (idx >= 0) this.scheduled.splice(idx, 1);
      
      // Disconnect source to free graph resources
      try { src.disconnect(); } catch {}
      
      // Update speaking state (per generation)
      this.decSpeaking(gen);
      
      // Reset timing if we're caught up
      if (Math.abs(this.nextTime - this.ctx.currentTime) < 0.02) {
        this.nextTime = 0;
      }
      
      // If no more scheduled nodes and we're soft switching, flip to next gen
      if (this.softSwitching && this.scheduled.length === 0) {
        console.log(`[TTSPlayer] Soft switch complete - promoting gen ${this.pendingGen}`);
        // Promote pending to active
        this.currentGen = this.pendingGen;
        this.stash24k = new Int16Array(0);
        this.queue = this.pendingQueue;
        this.pendingQueue = [];
        this.softSwitching = false;
        // Reset scheduler cursor for new generation
        this.nextTime = this.ctx.currentTime + this.TARGET_LEAD_SEC;
        
        // Start draining the new generation
        if (!this.playing && this.queue.length > 0) {
          this.drain(this.currentGen);
        }
      }
    };
  }
  
  // Call this when a brand new assistant utterance begins (hard cut)
  public startUtterance() {
    this.currentGen += 1;
    
    // Check if we're carrying backlog from previous turn
    const currentLead = this.nextTime - this.ctx.currentTime;
    if (currentLead > 0.5) {
      console.warn(`[TTSPlayer] Carrying ${Math.round(currentLead * 1000)}ms backlog from previous turn`);
    }
    
    console.log(`[TTSPlayer] Starting new utterance - hard cut (gen ${this.currentGen})`);
    
    // Stop anything from previous generations
    this.forceStopOlderGenerations();
    
    // Reset state for a clean start
    this.stash24k = new Int16Array(0);
    this.queue.length = 0;
    // Reset scheduler cursor to small lead (don't carry backlog)
    this.nextTime = this.ctx.currentTime + this.LEAD_SEC;
    this.softSwitching = false;
    this.pendingQueue = [];
    
    // Reset speaking state for new generation
    this.speakingByGen.set(this.currentGen, 0);
    this.onSpeakingChange?.(false);  // Notify immediately
  }
  
  // Call this for soft handoff - lets current sentence finish before switching
  public startUtteranceSoft() {
    // Declare the next generation but don't cut current audio
    this.pendingGen = this.currentGen + 1;
    this.softSwitching = true;
    this.pendingQueue = [];
    console.log(`[TTSPlayer] Starting soft utterance switch (pending gen ${this.pendingGen})`);
  }
  
  // Call this for each incoming PCM packet with turn tracking
  public onAssistantTurnPacket(turnId: number, data: ArrayBuffer | ArrayBufferView | Buffer) {
    // If soft switching and packets belong to the next turn, hold them
    if (this.softSwitching && turnId === this.pendingGen) {
      const int16 = this.toInt16(data);
      this.pendingQueue.push(int16);
      
      // Log pending queue growth occasionally
      if (this.pendingQueue.length % 10 === 0) {
        console.log(`[TTSPlayer] Buffering pending audio: ${this.pendingQueue.length} segments`);
      }
      return;
    }
    
    // Otherwise enqueue normally for current turn
    this.enqueue(data);
  }
  
  public enqueue(data: ArrayBuffer | ArrayBufferView | Buffer) {
    // Never drop audio - always enqueue everything
    
    // Convert to Int16Array robustly
    const int16 = this.toInt16(data);
    
    this.queue.push(int16);
    
    // Update backpressure state with gated logging
    if (this.queue.length > this.HI_WATER) {
      if (!this.overwater) {
        this.onBackpressure?.({ level: 'high', segments: this.queue.length });
        const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (t - this.lastWaterLogAt > 500) {
          console.log(`[TTSPlayer] High water mark reached (${this.queue.length} segments)`);
          this.lastWaterLogAt = t;
        }
      }
      this.overwater = true;
    }
    if (this.queue.length < this.LO_WATER) {
      if (this.overwater) {
        this.onBackpressure?.({ level: 'normal', segments: this.queue.length });
      }
      this.overwater = false;
    }
    
    // Never shed backlog or apply caps - play everything
    
    // Start draining if not already playing
    if (!this.playing) {
      this.drain(this.currentGen);
    }
  }
  
  // Shed backlog if severely over-buffered (DISABLED - never drop audio)
  private shedBacklogIfNeeded() {
    // Do nothing - we never drop audio
    return;
  }
  
  private async drain(gen: number) {
    this.playing = true;
    this.drainingGen = gen;
    
    const minSamples = Math.round((this.MIN_MS / 1000) * this.S_TTS); // 64ms at 24kHz
    const maxSamples = Math.round((this.MAX_MS / 1000) * this.S_TTS); // 160ms at 24kHz
    
    while (this.drainingGen === this.currentGen) {
      // Fill stash to at least minimum size
      while (this.stash24k.length < minSamples && this.queue.length > 0 && this.drainingGen === this.currentGen) {
        this.stash24k = this.int16Concat(this.stash24k, this.queue.shift()!);
      }
      
      // Check if generation changed
      if (this.drainingGen !== this.currentGen) break;
      
      if (this.stash24k.length === 0) {
        // Nothing to schedule, yield
        await new Promise(resolve => setTimeout(resolve, 0));
        if (this.queue.length === 0) break;
        continue;
      }
      
      // Take up to maxSamples
      const takeCount = Math.min(this.stash24k.length, maxSamples);
      const chunk24k = this.stash24k.subarray(0, takeCount);
      this.stash24k = this.stash24k.subarray(takeCount);
      
      // Convert and resample
      const f32_24k = this.int16ToF32(chunk24k);
      const f32_ctx = this.resampleToCtx(f32_24k);
      
      // Schedule playback
      await this.scheduleF32(f32_ctx, gen);
      
      // Log timing occasionally
      if (this.queue.length % 20 === 0) {
        const nextInMs = Math.round((this.nextTime - this.ctx.currentTime) * 1000);
        const stashMs = Math.round(this.stash24k.length / 24); // 24 samples per ms at 24kHz
        console.log(`[TTSPlayer] Scheduled: nextInMs=${nextInMs}, queueSegments=${this.queue.length}, stashMs=${stashMs}, gen=${gen}`);
      }
      
      // Light yield so the socket can push more
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    this.playing = false;
  }
  
  // Stop everything from older generations with a short fade
  private forceStopOlderGenerations() {
    const now = this.ctx.currentTime;
    const fadeTime = 0.03; // 30ms fade
    
    try {
      // Cancel any scheduled gain changes
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      // Fade out quickly
      this.masterGain.gain.linearRampToValueAtTime(0.0, now + fadeTime);
    } catch (e) {
      console.warn('[TTSPlayer] Failed to set fade out:', e);
    }
    
    // Stop all sources from older generations
    for (const scheduled of [...this.scheduled]) {
      if (scheduled.gen !== this.currentGen) {
        try {
          scheduled.src.stop();
        } catch (e) {
          // Already stopped or scheduled to stop
        }
      }
    }
    
    // Clean up scheduled array immediately (don't wait for onended)
    this.scheduled = this.scheduled.filter(s => s.gen === this.currentGen);
    
    // Clear speaking counters for older generations
    this.speakingByGen.forEach((_, gen) => {
      if (gen !== this.currentGen) {
        this.speakingByGen.set(gen, 0);
      }
    });
    
    // Restore gain after the fade
    setTimeout(() => {
      try {
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.setValueAtTime(0.0, t);
        this.masterGain.gain.linearRampToValueAtTime(1.0, t + 0.01);
      } catch (e) {
        console.warn('[TTSPlayer] Failed to restore gain:', e);
      }
    }, fadeTime * 1000 + 10); // Wait for fade + 10ms
  }
  
  public flush() {
    // User interrupts or immediate stop needed
    console.log('[TTSPlayer] Flushing audio (interrupt)');
    this.currentGen += 1; // Invalidate everything
    this.forceStopOlderGenerations();
    this.stash24k = new Int16Array(0);
    this.queue.length = 0;
    this.nextTime = 0;
    
    // Clear and reset speaking state
    this.speakingByGen.clear();
    this.speakingByGen.set(this.currentGen, 0);
    this.onSpeakingChange?.(false);  // Notify immediately
  }
  
  public getQueueSize(): number {
    return this.queue.length;
  }
  
  public getContext(): AudioContext {
    return this.ctx;
  }
  
  public setLeadSeconds(seconds: number) {
    this.LEAD_SEC = Math.max(0.06, Math.min(0.20, seconds));
  }
  
  // Register callback for speaking state changes
  public onPlaybackActiveChange(callback: (speaking: boolean) => void) {
    this.onSpeakingChange = callback;
  }
  
  // Get current speaking state
  public isSpeaking(): boolean {
    return (this.speakingByGen.get(this.currentGen) ?? 0) > 0;
  }
  
  // Get current lead time in milliseconds (for metrics/debugging)
  public getLeadMs(): number {
    return Math.max(0, this.nextTime - this.ctx.currentTime) * 1000;
  }
  
  // Duck TTS volume on VAD voice onset (-12dB over 40ms)
  public duck() {
    if (this.isDucked) return;
    const now = this.ctx.currentTime;
    this.duckingGain.gain.cancelScheduledValues(now);
    this.duckingGain.gain.setValueAtTime(this.duckingGain.gain.value, now);
    this.duckingGain.gain.linearRampToValueAtTime(0.25, now + 0.04); // -12dB in 40ms
    this.isDucked = true;
    console.log('[TTSPlayer] Ducking TTS audio (-12dB)');
  }
  
  // Restore TTS volume after VAD voice ends
  public unduck() {
    if (!this.isDucked) return;
    const now = this.ctx.currentTime;
    this.duckingGain.gain.cancelScheduledValues(now);
    this.duckingGain.gain.setValueAtTime(this.duckingGain.gain.value, now);
    this.duckingGain.gain.linearRampToValueAtTime(1.0, now + 0.1); // Restore in 100ms
    this.isDucked = false;
    console.log('[TTSPlayer] Restoring TTS audio');
  }
  
  // Get current metrics for observability
  public getMetrics() {
    return {
      leadMs: this.getLeadMs(),
      queueSize: this.queue.length,
      isPlaying: this.playing,
      isSpeaking: this.isSpeaking(),
      generation: this.currentGen,
      scheduledCount: this.scheduled.length,
      overwater: this.overwater,
      isDucked: this.isDucked
    };
  }
}