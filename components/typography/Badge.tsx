import React from 'react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface BadgeProps {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center font-semibold rounded-full';

  const variantClasses: Record<string, string> = {
    neutral: 'bg-gray-700 text-gray-200',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-600 text-white',
    danger: 'bg-red-600 text-white',
    info: 'bg-blue-600 text-white',
  };

  const sizeClasses: Record<string, string> = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;

export const badgeMetadata: ComponentMetadata = {
  name: 'Badge',
  description: 'Small label for status, category, or count',
  category: 'typography',
  variants: [
    { name: 'neutral', description: 'Gray badge for general use' },
    { name: 'success', description: 'Green badge for success states' },
    { name: 'warning', description: 'Yellow badge for warnings' },
    { name: 'danger', description: 'Red badge for errors or important items' },
    { name: 'info', description: 'Blue badge for informational content' },
  ],
  sizes: ['sm', 'md', 'lg'],
  applicableStates: ['default'],
  props: [
    { name: 'variant', type: "'neutral' | 'success' | 'warning' | 'danger' | 'info'", default: "'neutral'", required: false, description: 'Badge color variant' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", required: false, description: 'Badge size' },
    { name: 'children', type: 'React.ReactNode', required: true, description: 'Badge content' },
  ],
  example: '<Badge variant="success">Active</Badge>\n<Badge variant="warning" size="sm">3</Badge>',
  a11y: 'Uses semantic inline element. Add aria-label if badge contains non-descriptive content like icons or numbers.',
};

registerComponent(badgeMetadata);

