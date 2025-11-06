import React, { useEffect, useRef, useState } from 'react';

interface AudioWaveformProps {
  audioUrl: string;
  audioElement: HTMLAudioElement | null;
  width?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  barColor?: string;
  progressColor?: string;
}

export default function AudioWaveform({
  audioUrl,
  audioElement,
  width = 800,
  height = 120,
  barWidth = 3,
  gap = 2,
  barColor = '#4B5563',
  progressColor = '#3B82F6',
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProgress, setCurrentProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  // Load and analyze audio
  useEffect(() => {
    let audioContext: AudioContext | null = null;

    const loadAudio = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Extract waveform data
        const rawData = audioBuffer.getChannelData(0); // Use first channel
        const samples = 200; // Number of bars to display
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          const start = i * blockSize;
          const end = Math.min(start + blockSize, rawData.length);
          
          for (let j = start; j < end; j++) {
            sum += Math.abs(rawData[j]);
          }
          
          filteredData.push(sum / blockSize);
        }
        
        // Normalize data
        const max = Math.max(...filteredData);
        const normalized = filteredData.map(value => value / max);
        
        setWaveformData(normalized);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading audio for waveform:', error);
        setIsLoading(false);
      }
    };

    loadAudio();

    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioUrl]);

  // Update progress
  useEffect(() => {
    if (!audioElement || waveformData.length === 0) return;

    const updateProgress = () => {
      if (audioElement && !audioElement.paused && !audioElement.ended) {
        const progress = audioElement.currentTime / audioElement.duration;
        setCurrentProgress(progress);
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        const progress = audioElement.currentTime / audioElement.duration;
        setCurrentProgress(progress);
      }
    };

    const handleTimeUpdate = () => {
      if (audioElement) {
        const progress = audioElement.currentTime / audioElement.duration;
        setCurrentProgress(progress);
      }
    };

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('play', updateProgress);
    audioElement.addEventListener('pause', () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    });

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('play', updateProgress);
      audioElement.removeEventListener('pause', () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      });
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioElement, waveformData.length]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    
    const totalBars = waveformData.length;
    const barSpacing = barWidth + gap;
    const maxBars = Math.floor(width / barSpacing);
    const barsToShow = Math.min(totalBars, maxBars);
    const startIndex = 0;
    
    const centerY = height / 2;
    const progressIndex = Math.floor(currentProgress * barsToShow);

    for (let i = 0; i < barsToShow; i++) {
      const dataIndex = Math.floor((i / barsToShow) * totalBars);
      const amplitude = waveformData[dataIndex];
      const barHeight = Math.max(2, amplitude * (height - 20)); // Min 2px height
      
      const x = i * barSpacing;
      const y = centerY - barHeight / 2;
      
      // Use progress color if past current position
      const color = i <= progressIndex ? progressColor : barColor;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [waveformData, currentProgress, width, height, barWidth, gap, barColor, progressColor]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioElement || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickProgress = Math.max(0, Math.min(1, x / width));
    
    if (audioElement.duration) {
      audioElement.currentTime = clickProgress * audioElement.duration;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-30 flex items-center justify-center bg-gray-800 rounded-lg">
        <div className="text-gray-400 text-sm">Loading waveform...</div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={handleCanvasClick}
      className="w-full cursor-pointer rounded-lg"
      style={{ maxWidth: '100%', height: `${height}px` }}
    />
  );
}

