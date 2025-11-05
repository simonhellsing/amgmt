import React from 'react';
import Link from 'next/link';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface CardProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, padding = 'md', hoverable = false, href, onClick, className = '' }, ref) => {
    const baseClasses = 'rounded-lg bg-gray-800 border border-gray-700 transition-all duration-normal';

    const paddingClasses: Record<string, string> = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const interactiveClasses = hoverable || href || onClick
      ? 'hover:bg-gray-750 hover:border-gray-600 cursor-pointer'
      : '';

    const classes = `${baseClasses} ${paddingClasses[padding]} ${interactiveClasses} ${className}`;

    if (href) {
      return (
        <Link href={href} className={classes}>
          {children}
        </Link>
      );
    }

    return (
      <div ref={ref} className={classes} onClick={onClick}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;

export const cardMetadata: ComponentMetadata = {
  name: 'Card',
  description: 'Container component for content grouping',
  category: 'layout',
  variants: [
    { name: 'default', description: 'Static card' },
    { name: 'hoverable', description: 'Interactive card with hover effect' },
    { name: 'link', description: 'Card that navigates to a URL' },
  ],
  sizes: ['md'],
  applicableStates: ['default', 'hover'],
  props: [
    { name: 'padding', type: "'none' | 'sm' | 'md' | 'lg'", default: "'md'", required: false, description: 'Internal padding' },
    { name: 'hoverable', type: 'boolean', default: 'false', required: false, description: 'Shows hover effect' },
    { name: 'href', type: 'string', required: false, description: 'Makes card a link' },
    { name: 'onClick', type: '() => void', required: false, description: 'Click handler' },
  ],
  example: '<Card>\n  Content here\n</Card>\n\n<Card hoverable href="/details">\n  Clickable card\n</Card>',
  a11y: 'Link cards use semantic <a> tags. Click handlers should include keyboard support.',
};

registerComponent(cardMetadata);

