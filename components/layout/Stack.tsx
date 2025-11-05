import React from 'react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface StackProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
  spacing?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'vertical',
  spacing = 4,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className = '',
}) => {
  const baseClasses = 'flex';
  
  const directionClasses = direction === 'vertical' ? 'flex-col' : 'flex-row';
  
  const spacingClasses: Record<number, string> = {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
    12: 'gap-12',
  };
  
  const alignClasses: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };
  
  const justifyClasses: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };
  
  const wrapClasses = wrap ? 'flex-wrap' : '';

  return (
    <div
      className={`${baseClasses} ${directionClasses} ${spacingClasses[spacing]} ${alignClasses[align]} ${justifyClasses[justify]} ${wrapClasses} ${className}`}
    >
      {children}
    </div>
  );
};

export default Stack;

export const stackMetadata: ComponentMetadata = {
  name: 'Stack',
  description: 'Flexbox layout component for arranging children with consistent spacing',
  category: 'layout',
  variants: [
    { name: 'vertical', description: 'Stacks children vertically' },
    { name: 'horizontal', description: 'Stacks children horizontally' },
  ],
  sizes: ['md'],
  applicableStates: ['default'],
  props: [
    { name: 'direction', type: "'vertical' | 'horizontal'", default: "'vertical'", required: false, description: 'Stack direction' },
    { name: 'spacing', type: '0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12', default: '4', required: false, description: 'Space between children' },
    { name: 'align', type: "'start' | 'center' | 'end' | 'stretch'", default: "'stretch'", required: false, description: 'Cross-axis alignment' },
    { name: 'justify', type: "'start' | 'center' | 'end' | 'between' | 'around'", default: "'start'", required: false, description: 'Main-axis alignment' },
  ],
  example: '<Stack spacing={4}>\n  <div>Item 1</div>\n  <div>Item 2</div>\n</Stack>',
  a11y: 'Purely presentational component. Ensure children have proper semantics.',
};

registerComponent(stackMetadata);

