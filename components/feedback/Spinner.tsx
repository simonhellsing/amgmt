import React from 'react';
import { Loader2 } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses: Record<string, string> = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2
      className={`animate-spin text-gray-400 ${sizeClasses[size]} ${className}`}
      aria-label="Loading"
    />
  );
};

export default Spinner;

export const spinnerMetadata: ComponentMetadata = {
  name: 'Spinner',
  description: 'Loading spinner indicator',
  category: 'feedback',
  variants: [{ name: 'default', description: 'Rotating loader icon' }],
  sizes: ['sm', 'md', 'lg'],
  applicableStates: ['default'],
  props: [
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", required: false, description: 'Spinner size' },
  ],
  example: '<Spinner />\n<Spinner size="lg" />',
  a11y: 'Has aria-label="Loading" for screen readers.',
};

registerComponent(spinnerMetadata);

