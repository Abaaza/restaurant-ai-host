// AudioWorklet processor for capturing microphone audio at 48kHz with 20ms frames
class MicProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    
    // Get frame samples from options or calculate for 20ms at current sample rate
    // For 48kHz: 48000 * 0.02 = 960 samples per 20ms frame
    this.frameSamples = options.processorOptions?.frameSamples || 960;
    this.downmix = options.processorOptions?.downmix !== false;
    
    // Buffer to accumulate samples until we have a full frame
    this.buffer = new Float32Array(0);
    
    console.log(`MicProcessor initialized: frameSamples=${this.frameSamples}, downmix=${this.downmix}`);
  }
  
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // Return true to keep processor alive even if no input
    if (!input || input.length === 0) {
      return true;
    }
    
    // Get first channel (mono) or mix stereo to mono if needed
    let audioData;
    if (input.length === 1 || !this.downmix) {
      // Already mono or don't want to downmix
      audioData = input[0];
    } else {
      // Mix stereo to mono
      audioData = new Float32Array(input[0].length);
      for (let i = 0; i < input[0].length; i++) {
        let sum = 0;
        for (let channel = 0; channel < input.length; channel++) {
          sum += input[channel][i];
        }
        audioData[i] = sum / input.length;
      }
    }
    
    // Skip if no audio data
    if (!audioData || audioData.length === 0) {
      return true;
    }
    
    // Combine buffer with new data
    const combinedLength = this.buffer.length + audioData.length;
    const combined = new Float32Array(combinedLength);
    combined.set(this.buffer, 0);
    combined.set(audioData, this.buffer.length);
    
    // Extract and send complete frames
    let offset = 0;
    while (offset + this.frameSamples <= combined.length) {
      // Extract a frame
      const frame = combined.slice(offset, offset + this.frameSamples);
      
      // Send frame to main thread (transfer ownership for efficiency)
      // We need to clone since we can't transfer a view
      const frameBuffer = new Float32Array(frame);
      this.port.postMessage(
        { type: 'audio', data: frameBuffer },
        [frameBuffer.buffer]
      );
      
      offset += this.frameSamples;
    }
    
    // Keep leftover samples for next process call
    this.buffer = combined.slice(offset);
    
    // Return true to keep processor running
    return true;
  }
}

// Register the processor
registerProcessor('mic-processor', MicProcessor);