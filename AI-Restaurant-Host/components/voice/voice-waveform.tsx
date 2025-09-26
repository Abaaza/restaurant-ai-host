'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface VoiceWaveformProps {
  isActive: boolean;
  color?: 'blue' | 'green' | 'gray';
  height?: number;
}

export function VoiceWaveform({ isActive, color = 'blue', height = 80 }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const drawWaveform = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Set color based on prop
      const colors = {
        blue: '#3b82f6',
        green: '#10b981',
        gray: '#6b7280'
      };
      ctx.strokeStyle = colors[color];
      ctx.lineWidth = 2;

      // Draw waveform
      ctx.beginPath();
      
      const bars = 40;
      const barWidth = width / bars;
      
      for (let i = 0; i < bars; i++) {
        const x = i * barWidth + barWidth / 2;
        
        // Create wave effect
        let amplitude = height / 4;
        if (isActive) {
          // Add random variation when active
          const randomFactor = 0.5 + Math.random() * 0.5;
          const waveFactor = Math.sin((i / bars) * Math.PI * 2 + phaseRef.current) * 0.5 + 0.5;
          amplitude = (height / 3) * waveFactor * randomFactor;
        } else {
          // Flat line when inactive
          amplitude = 1;
        }
        
        const y1 = (height / 2) - amplitude;
        const y2 = (height / 2) + amplitude;
        
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
      }
      
      ctx.stroke();
      
      // Update phase for animation
      if (isActive) {
        phaseRef.current += 0.15;
      }
      
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, color, height]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative w-full"
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-0.5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      )}
    </motion.div>
  );
}