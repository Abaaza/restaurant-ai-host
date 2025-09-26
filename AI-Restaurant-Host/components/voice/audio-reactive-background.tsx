'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioReactiveBackgroundProps {
  audioLevel?: number; // 0-1 normalized audio level
  isActive?: boolean;
  frequency?: number; // dominant frequency for color shifts
}

export function AudioReactiveBackground({ 
  audioLevel = 0, 
  isActive = false,
  frequency = 0 
}: AudioReactiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  const particlesRef = useRef<Array<{x: number, y: number, vx: number, vy: number, life: number}>>([]);
  
  // Store audio values in refs to avoid re-initializing animation
  const audioLevelRef = useRef(audioLevel);
  const isActiveRef = useRef(isActive);
  const frequencyRef = useRef(frequency);
  
  // Update refs when props change (without restarting animation)
  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);
  
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  
  useEffect(() => {
    frequencyRef.current = frequency;
  }, [frequency]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create gradient mesh points
    const meshPoints = [
      { x: 0.2, y: 0.3, color: { r: 255, g: 182, b: 193 } }, // Light pink
      { x: 0.8, y: 0.2, color: { r: 173, g: 216, b: 230 } }, // Light blue
      { x: 0.5, y: 0.7, color: { r: 221, g: 160, b: 221 } }, // Plum
      { x: 0.1, y: 0.8, color: { r: 255, g: 218, b: 185 } }, // Peach
      { x: 0.9, y: 0.9, color: { r: 230, g: 230, b: 250 } }, // Lavender
    ];

    const animate = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, width, height);

      // Update time
      timeRef.current += 0.005;

      // Audio reactive intensity - use ref values
      const currentAudioLevel = audioLevelRef.current;
      const currentFrequency = frequencyRef.current;
      const intensity = 1 + currentAudioLevel * 2;
      const morphSpeed = 0.001 + currentAudioLevel * 0.003;

      // Draw gradient mesh
      meshPoints.forEach((point, i) => {
        // Animate mesh points based on audio
        const offsetX = Math.sin(timeRef.current + i * 1.5) * 0.1 * intensity;
        const offsetY = Math.cos(timeRef.current + i * 1.2) * 0.1 * intensity;
        
        const x = (point.x + offsetX) * width;
        const y = (point.y + offsetY) * height;
        
        // Create radial gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, width * 0.5 * intensity);
        
        // Adjust colors based on frequency
        const freqShift = currentFrequency * 50;
        const r = Math.min(255, point.color.r + freqShift);
        const g = Math.max(0, point.color.g - freqShift * 0.5);
        const b = Math.min(255, point.color.b + freqShift * 0.3);
        
        // Audio reactive opacity
        const opacity = 0.15 + currentAudioLevel * 0.2;
        
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      });

      // Add particles on audio peaks
      if (currentAudioLevel > 0.6 && Math.random() > 0.7) {
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push({
            x: width / 2 + (Math.random() - 0.5) * 200,
            y: height / 2 + (Math.random() - 0.5) * 200,
            vx: (Math.random() - 0.5) * 5 * currentAudioLevel,
            vy: (Math.random() - 0.5) * 5 * currentAudioLevel,
            life: 1
          });
        }
      }

      // Update and draw particles
      ctx.save();
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.01;
        particle.vx *= 0.98;
        particle.vy *= 0.98;

        if (particle.life > 0) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, 3 * particle.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(147, 197, 253, ${particle.life * 0.5})`;
          ctx.fill();
          return true;
        }
        return false;
      });
      ctx.restore();

      // Floating orbs
      for (let i = 0; i < 3; i++) {
        const orbX = width * (0.2 + i * 0.3) + Math.sin(timeRef.current * 0.5 + i) * 100;
        const orbY = height * 0.5 + Math.cos(timeRef.current * 0.3 + i) * 150;
        const orbSize = 100 + currentAudioLevel * 50;
        
        const orbGradient = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, orbSize);
        orbGradient.addColorStop(0, `rgba(255, 182, 193, ${0.1 + currentAudioLevel * 0.1})`);
        orbGradient.addColorStop(0.5, `rgba(173, 216, 230, ${0.05 + currentAudioLevel * 0.05})`);
        orbGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = orbGradient;
        ctx.beginPath();
        ctx.arc(orbX, orbY, orbSize, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Only run once on mount

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ 
          background: 'linear-gradient(135deg, #ffeef0 0%, #e6f3ff 50%, #f0e6ff 100%)',
          opacity: 0.8
        }}
      />
      
      {/* Additional animated gradients */}
      <motion.div
        className="fixed inset-0 opacity-30"
        animate={{
          background: [
            'radial-gradient(circle at 20% 30%, rgba(255, 182, 193, 0.4) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 70%, rgba(173, 216, 230, 0.4) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, rgba(221, 160, 221, 0.4) 0%, transparent 50%)',
          ]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
      />
      
      {/* Audio reactive overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: audioLevel * 0.2,
          background: `radial-gradient(circle at 50% 50%, rgba(147, 197, 253, ${audioLevel * 0.3}) 0%, transparent 70%)`,
          mixBlendMode: 'screen',
          transition: 'opacity 0.3s ease-out'
        }}
      />
    </>
  );
}