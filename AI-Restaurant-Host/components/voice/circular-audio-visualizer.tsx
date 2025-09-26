'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface CircularAudioVisualizerProps {
  audioData?: Uint8Array; // Frequency data from analyser
  audioLevel?: number; // 0-1 normalized audio level
  isUserSpeaking?: boolean;
  isAgentSpeaking?: boolean;
  size?: number;
}

export function CircularAudioVisualizer({
  audioData,
  audioLevel = 0,
  isUserSpeaking = false,
  isAgentSpeaking = false,
  size = 300
}: CircularAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const rotationRef = useRef(0);
  const historyRef = useRef<number[]>(new Array(60).fill(0));
  const particlesRef = useRef<Array<{
    angle: number,
    radius: number,
    velocity: number,
    life: number,
    color: string
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 20;

    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      // Update rotation
      rotationRef.current += 0.01 + audioLevel * 0.02;

      // Update history
      historyRef.current.push(audioLevel);
      if (historyRef.current.length > 60) {
        historyRef.current.shift();
      }

      // Determine color based on speaker
      const baseColor = isUserSpeaking ? '59, 130, 246' : // Blue
                       isAgentSpeaking ? '236, 72, 153' : // Pink
                       '156, 163, 175'; // Gray

      // Draw outer glow
      const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      glowGradient.addColorStop(0, `rgba(${baseColor}, ${0.1 + audioLevel * 0.2})`);
      glowGradient.addColorStop(0.5, `rgba(${baseColor}, ${0.05 + audioLevel * 0.1})`);
      glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw frequency bars in circle
      if (audioData && audioData.length > 0) {
        const bars = 64;
        const barWidth = (Math.PI * 2) / bars;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotationRef.current);

        for (let i = 0; i < bars; i++) {
          const angle = i * barWidth;
          const frequency = audioData[Math.floor(i * audioData.length / bars)] || 0;
          const normalizedFreq = frequency / 255;
          const barHeight = 20 + normalizedFreq * 60;
          const innerRadius = 50 + audioLevel * 10;

          // Draw frequency bar
          ctx.save();
          ctx.rotate(angle);
          
          const gradient = ctx.createLinearGradient(0, innerRadius, 0, innerRadius + barHeight);
          gradient.addColorStop(0, `rgba(${baseColor}, 0.8)`);
          gradient.addColorStop(1, `rgba(${baseColor}, 0.1)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(-1, innerRadius, 2, barHeight);
          
          // Add glow for loud frequencies
          if (normalizedFreq > 0.7) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = `rgba(${baseColor}, 0.5)`;
            ctx.fillRect(-1, innerRadius, 2, barHeight);
            ctx.shadowBlur = 0;
          }
          
          ctx.restore();
        }
        ctx.restore();
      }

      // Draw central circle with pulse
      const pulseRadius = 40 + audioLevel * 20;
      
      // Inner circle gradient
      const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulseRadius);
      centerGradient.addColorStop(0, `rgba(${baseColor}, 0.9)`);
      centerGradient.addColorStop(0.7, `rgba(${baseColor}, 0.4)`);
      centerGradient.addColorStop(1, `rgba(${baseColor}, 0.1)`);
      
      ctx.fillStyle = centerGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw history rings
      ctx.strokeStyle = `rgba(${baseColor}, 0.2)`;
      ctx.lineWidth = 1;
      historyRef.current.forEach((level, i) => {
        const age = i / historyRef.current.length;
        const radius = 40 + level * 30 + age * 50;
        ctx.globalAlpha = (1 - age) * 0.3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // Create particles on audio peaks
      if (audioLevel > 0.7 && Math.random() > 0.5) {
        const particleCount = Math.floor(audioLevel * 5);
        for (let i = 0; i < particleCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          particlesRef.current.push({
            angle,
            radius: pulseRadius,
            velocity: 2 + audioLevel * 3,
            life: 1,
            color: `rgba(${baseColor}, 0.6)`
          });
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.radius += particle.velocity;
        particle.life -= 0.02;
        particle.velocity *= 0.98;

        if (particle.life > 0) {
          const x = centerX + Math.cos(particle.angle) * particle.radius;
          const y = centerY + Math.sin(particle.angle) * particle.radius;
          
          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          ctx.beginPath();
          ctx.arc(x, y, 2 * particle.life, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          
          return true;
        }
        return false;
      });

      // Draw connection status dot
      const statusRadius = 5;
      const statusX = centerX;
      const statusY = centerY;
      
      if (isUserSpeaking || isAgentSpeaking) {
        ctx.fillStyle = `rgba(${baseColor}, 1)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${baseColor}, 0.5)`;
        ctx.beginPath();
        ctx.arc(statusX, statusY, statusRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioData, audioLevel, isUserSpeaking, isAgentSpeaking, size]);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      className="relative w-full h-full flex items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ maxWidth: `${size}px`, maxHeight: `${size}px` }}
      />
      
      {/* Subtle rotation animation for the container */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          rotate: [0, 360]
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          background: `conic-gradient(from 0deg, rgba(59, 130, 246, 0.05), rgba(236, 72, 153, 0.05), rgba(59, 130, 246, 0.05))`,
          filter: 'blur(40px)'
        }}
      />
    </motion.div>
  );
}