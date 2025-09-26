// AudioWorklet processor for real-time PCM audio streaming
// Runs on a separate audio thread for better performance

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer size for PCM chunks (2048 samples = ~42ms at 48kHz)
    this.bufferSize = 2048;
    this.sampleBuffer = new Float32Array(this.bufferSize);
    this.sampleIndex = 0;
    
    // Volume calculation
    this.volumeBuffer = new Float32Array(128);
    this.volumeIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Check if we have valid input
    if (!input || !input[0] || input[0].length === 0) {
      return true; // Keep processor alive
    }

    const inputChannel = input[0];
    
    // Process each sample
    for (let i = 0; i < inputChannel.length; i++) {
      // Add sample to buffer
      this.sampleBuffer[this.sampleIndex++] = inputChannel[i];
      
      // Track volume for visualization
      this.volumeBuffer[this.volumeIndex++] = Math.abs(inputChannel[i]);
      if (this.volumeIndex >= this.volumeBuffer.length) {
        // Calculate average volume
        let sum = 0;
        for (let j = 0; j < this.volumeBuffer.length; j++) {
          sum += this.volumeBuffer[j];
        }
        const avgVolume = sum / this.volumeBuffer.length;
        
        // Send volume update
        this.port.postMessage({
          type: 'volume',
          level: avgVolume
        });
        
        this.volumeIndex = 0;
      }
      
      // When buffer is full, convert to PCM and send
      if (this.sampleIndex >= this.bufferSize) {
        // Convert Float32 [-1, 1] to Int16 PCM
        const int16 = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          // Clamp to [-1, 1] range
          const s = Math.max(-1, Math.min(1, this.sampleBuffer[j]));
          // Convert to 16-bit PCM
          int16[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Transfer buffer to main thread (zero-copy with Transferable)
        this.port.postMessage({
          type: 'audio',
          buffer: int16.buffer,
          sampleRate: sampleRate,  // AudioWorklet global
          timestamp: currentTime   // AudioWorklet global
        }, [int16.buffer]);
        
        // Reset buffer
        this.sampleIndex = 0;
      }
    }
    
    // Return true to keep processor alive
    return true;
  }
}

// Register the processor
registerProcessor('pcm-processor', PCMProcessor);