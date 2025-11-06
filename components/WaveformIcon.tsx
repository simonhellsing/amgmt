import React from 'react';

interface WaveformIconProps {
  className?: string;
  size?: number;
}

export default function WaveformIcon({ className = '', size = 24 }: WaveformIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Waveform bars - varying heights to create a waveform pattern */}
      <rect x="2" y="12" width="2" height="8" rx="1" fill="currentColor" />
      <rect x="5" y="8" width="2" height="16" rx="1" fill="currentColor" />
      <rect x="8" y="4" width="2" height="20" rx="1" fill="currentColor" />
      <rect x="11" y="10" width="2" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="6" width="2" height="18" rx="1" fill="currentColor" />
      <rect x="17" y="14" width="2" height="10" rx="1" fill="currentColor" />
      <rect x="20" y="8" width="2" height="16" rx="1" fill="currentColor" />
    </svg>
  );
}

