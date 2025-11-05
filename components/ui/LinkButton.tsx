import React from 'react';
import Link from 'next/link';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Destination URL */
  href: string;
  
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost' | 'link';
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Link content */
  children: React.ReactNode;
  
  /** Disabled state (prevents navigation) */
  disabled?: boolean;
  
  /** Full width */
  fullWidth?: boolean;
  
  /** Open in new tab */
  external?: boolean;
}

export const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  (
    {
      href,
      variant = 'primary',
      size = 'md',
      children,
      disabled = false,
      fullWidth = false,
      external = false,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      'inline-flex',
      'items-center',
      'justify-center',
      'font-semibold',
      'rounded-md',
      'transition-all',
      'duration-normal',
      'focus:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-offset-2',
      'no-underline',
      'cursor-pointer',
    ].join(' ');

    const variantClasses: Record<string, string> = {
      primary: [
        'bg-white',
        'hover:bg-gray-100',
        'active:bg-gray-200',
        'text-gray-900',
        'focus-visible:ring-gray-500',
        'shadow-sm',
      ].join(' '),
      secondary: [
        'bg-gray-700',
        'hover:bg-gray-600',
        'active:bg-gray-500',
        'text-white',
        'focus-visible:ring-gray-500',
        'shadow-sm',
      ].join(' '),
      tertiary: [
        'bg-transparent',
        'hover:bg-gray-700',
        'active:bg-gray-600',
        'text-gray-300',
        'border',
        'border-gray-600',
        'focus-visible:ring-gray-500',
      ].join(' '),
      destructive: [
        'bg-red-600',
        'hover:bg-red-700',
        'active:bg-red-800',
        'text-white',
        'focus-visible:ring-red-500',
        'shadow-sm',
      ].join(' '),
      ghost: [
        'bg-transparent',
        'hover:bg-gray-700',
        'active:bg-gray-600',
        'text-gray-300',
        'focus-visible:ring-gray-500',
      ].join(' '),
      link: [
        'bg-transparent',
        'hover:underline',
        'text-gray-300',
        'hover:text-white',
        'focus-visible:ring-gray-500',
        'p-0',
      ].join(' '),
    };

    const sizeClasses: Record<string, string> = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2',
    };

    // Override sizing for link variant
    const finalSizeClasses = variant === 'link' ? '' : sizeClasses[size];

    const disabledClasses = disabled
      ? 'opacity-50 cursor-not-allowed pointer-events-none'
      : '';

    const widthClasses = fullWidth ? 'w-full' : '';

    const classes = [
      baseClasses,
      variantClasses[variant],
      finalSizeClasses,
      disabledClasses,
      widthClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    const linkProps = {
      className: classes,
      onClick: handleClick,
      ...(external && {
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
      ...props,
    };

    // Use Next.js Link for internal navigation, regular <a> for external
    if (external || href.startsWith('http') || href.startsWith('mailto:')) {
      return (
        <a ref={ref} href={disabled ? undefined : href} {...linkProps}>
          {children}
        </a>
      );
    }

    return (
      <Link ref={ref} href={disabled ? '#' : href} {...linkProps}>
        {children}
      </Link>
    );
  }
);

LinkButton.displayName = 'LinkButton';

export default LinkButton;

// Register component metadata for the gallery
export const linkButtonMetadata: ComponentMetadata = {
  name: 'LinkButton',
  description: 'Navigation link styled as a button. Supports both internal (Next.js) and external links',
  category: 'ui',
  variants: [
    {
      name: 'primary',
      description: 'High-emphasis action (white on dark)',
    },
    {
      name: 'secondary',
      description: 'Medium-emphasis action (gray background)',
    },
    {
      name: 'tertiary',
      description: 'Low-emphasis action (outlined)',
    },
    {
      name: 'destructive',
      description: 'Dangerous or destructive actions',
    },
    {
      name: 'ghost',
      description: 'Minimal emphasis, transparent background',
    },
    {
      name: 'link',
      description: 'Text-only, underlines on hover',
      applicableStates: ['default', 'hover', 'focus', 'disabled'],
    },
  ],
  sizes: ['sm', 'md', 'lg'],
  applicableStates: [
    'default',
    'hover',
    'active',
    'focus',
    'disabled',
  ],
  props: [
    {
      name: 'href',
      type: 'string',
      required: true,
      description: 'Destination URL',
    },
    {
      name: 'variant',
      type: "'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost' | 'link'",
      default: "'primary'",
      required: false,
      description: 'Visual style variant',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      required: false,
      description: 'Size variant',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Disabled state (prevents navigation)',
    },
    {
      name: 'fullWidth',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Makes link full width',
    },
    {
      name: 'external',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Opens in new tab (adds target="_blank" and rel="noopener noreferrer")',
    },
    {
      name: 'children',
      type: 'React.ReactNode',
      required: true,
      description: 'Link content',
    },
  ],
  example: `<LinkButton href="/dashboard" variant="primary">
  Go to Dashboard
</LinkButton>

<LinkButton href="https://example.com" external>
  External Link
</LinkButton>`,
  a11y: 'Uses semantic <a> tags for proper navigation. Disabled links prevent navigation but remain in tab order.',
};

registerComponent(linkButtonMetadata);

