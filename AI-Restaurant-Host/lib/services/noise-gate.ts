// Noise gate processor for filtering out background noise
export class NoiseGate {
  private audioContext: AudioContext;
  private source: MediaStreamAudioSourceNode;
  private gainNode: GainNode;
  private analyser: AnalyserNode;
  private processor: ScriptProcessorNode | null = null;
  
  // Noise gate parameters
  private threshold: number;
  private ratio: number;
  private attack: number;
  private release: number;
  private hold: number;
  
  // State tracking
  private isOpen: boolean = false;
  private holdTimer: NodeJS.Timeout | null = null;
  private currentGain: number = 0;
  private noiseFloor: number = 0;
  private calibrationSamples: number[] = [];
  private isCalibrating: boolean = true;
  private calibrationDuration: number = 2000; // 2 seconds calibration
  private calibrationStartTime: number = Date.now();
  
  // RMS calculation buffer
  private rmsBuffer: Float32Array;
  private rmsHistory: number[] = [];
  private rmsHistorySize: number = 50;
  
  constructor(
    audioContext: AudioContext,
    stream: MediaStream,
    options: {
      threshold?: number;      // -40 to 0 dB
      ratio?: number;          // 1:2 to 1:100
      attack?: number;         // 0-100ms
      release?: number;        // 0-1000ms
      hold?: number;           // 0-1000ms
    } = {}
  ) {
    this.audioContext = audioContext;
    
    // Set parameters with defaults
    this.threshold = options.threshold || -30; // dB
    this.ratio = options.ratio || 10;
    this.attack = options.attack || 10; // ms
    this.release = options.release || 100; // ms
    this.hold = options.hold || 50; // ms
    
    // Create audio nodes
    this.source = audioContext.createMediaStreamSource(stream);
    this.gainNode = audioContext.createGain();
    this.analyser = audioContext.createAnalyser();
    
    // Configure analyser
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.3;
    
    // Initialize RMS buffer
    this.rmsBuffer = new Float32Array(this.analyser.fftSize);
    
    // Connect initial chain
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    
    // Start with gate closed
    this.gainNode.gain.value = 0;
    
    console.log(`[NoiseGate] Initialized with threshold: ${this.threshold}dB, ratio: 1:${this.ratio}`);
    this.startCalibration();
  }
  
  // Start calibration to detect noise floor
  private startCalibration() {
    console.log('[NoiseGate] Starting noise floor calibration...');
    
    const calibrate = () => {
      if (!this.isCalibrating) return;
      
      const rms = this.calculateRMS();
      const rmsDb = 20 * Math.log10(Math.max(rms, 0.00001));
      this.calibrationSamples.push(rmsDb);
      
      // Check if calibration is complete
      if (Date.now() - this.calibrationStartTime >= this.calibrationDuration) {
        this.completeCalibration();
      } else {
        requestAnimationFrame(calibrate);
      }
    };
    
    calibrate();
  }
  
  // Complete calibration and set noise floor
  private completeCalibration() {
    this.isCalibrating = false;
    
    if (this.calibrationSamples.length > 0) {
      // Sort samples and take the 75th percentile as noise floor
      this.calibrationSamples.sort((a, b) => a - b);
      const index = Math.floor(this.calibrationSamples.length * 0.75);
      this.noiseFloor = this.calibrationSamples[index];
      
      // Set threshold slightly above noise floor
      const adaptiveThreshold = this.noiseFloor + 6; // 6dB above noise floor
      this.threshold = Math.max(this.threshold, adaptiveThreshold);
      
      console.log(`[NoiseGate] Calibration complete:`);
      console.log(`  - Noise floor: ${this.noiseFloor.toFixed(1)}dB`);
      console.log(`  - Adaptive threshold: ${this.threshold.toFixed(1)}dB`);
    }
    
    // Start the processing loop
    this.startProcessing();
  }
  
  // Calculate RMS of current audio
  private calculateRMS(): number {
    this.analyser.getFloatTimeDomainData(this.rmsBuffer);
    
    let sum = 0;
    for (let i = 0; i < this.rmsBuffer.length; i++) {
      sum += this.rmsBuffer[i] * this.rmsBuffer[i];
    }
    
    const rms = Math.sqrt(sum / this.rmsBuffer.length);
    
    // Add to history for smoothing
    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > this.rmsHistorySize) {
      this.rmsHistory.shift();
    }
    
    // Return smoothed RMS
    const smoothedRms = this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length;
    return smoothedRms;
  }
  
  // Convert linear gain to dB
  private linearToDb(value: number): number {
    return 20 * Math.log10(Math.max(value, 0.00001));
  }
  
  // Convert dB to linear gain
  private dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }
  
  // Start the noise gate processing
  private startProcessing() {
    const processAudio = () => {
      const rms = this.calculateRMS();
      const inputDb = this.linearToDb(rms);
      
      // Calculate if gate should be open
      const shouldOpen = inputDb > this.threshold;
      
      if (shouldOpen && !this.isOpen) {
        // Gate opening - apply attack
        this.openGate();
      } else if (!shouldOpen && this.isOpen) {
        // Gate closing - apply hold then release
        this.startHold();
      }
      
      // Continue processing
      requestAnimationFrame(processAudio);
    };
    
    processAudio();
  }
  
  // Open the gate with attack time
  private openGate() {
    this.isOpen = true;
    
    // Clear any pending hold timer
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    
    // Apply attack curve
    const attackTime = this.attack / 1000; // Convert to seconds
    this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.gainNode.gain.setValueAtTime(this.currentGain, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + attackTime);
    this.currentGain = 1;
    
    console.log('[NoiseGate] Gate opened');
  }
  
  // Start hold period before closing
  private startHold() {
    if (this.holdTimer) return; // Already in hold
    
    this.holdTimer = setTimeout(() => {
      this.closeGate();
      this.holdTimer = null;
    }, this.hold);
  }
  
  // Close the gate with release time
  private closeGate() {
    this.isOpen = false;
    
    // Apply release curve with ratio-based reduction
    const releaseTime = this.release / 1000; // Convert to seconds
    const reductionGain = 1 / this.ratio; // Calculate gain reduction based on ratio
    
    this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.gainNode.gain.setValueAtTime(this.currentGain, this.audioContext.currentTime);
    this.gainNode.gain.exponentialRampToValueAtTime(
      Math.max(reductionGain, 0.001), 
      this.audioContext.currentTime + releaseTime
    );
    this.currentGain = reductionGain;
    
    console.log('[NoiseGate] Gate closed');
  }
  
  // Connect the gate output to a destination
  public connect(destination: AudioNode) {
    this.gainNode.connect(destination);
  }
  
  // Disconnect all connections
  public disconnect() {
    try {
      this.source.disconnect();
      this.analyser.disconnect();
      this.gainNode.disconnect();
    } catch (e) {
      // Already disconnected
    }
    
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
  }
  
  // Update threshold dynamically
  public setThreshold(threshold: number) {
    this.threshold = threshold;
    console.log(`[NoiseGate] Threshold updated to ${threshold}dB`);
  }
  
  // Get current gate status
  public getStatus() {
    return {
      isOpen: this.isOpen,
      currentGain: this.currentGain,
      threshold: this.threshold,
      noiseFloor: this.noiseFloor,
      rms: this.calculateRMS(),
      rmsDb: this.linearToDb(this.calculateRMS())
    };
  }
  
  // Manually recalibrate noise floor
  public recalibrate() {
    this.isCalibrating = true;
    this.calibrationSamples = [];
    this.calibrationStartTime = Date.now();
    this.startCalibration();
  }
}