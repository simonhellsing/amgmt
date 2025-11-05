import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost';
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Icon component from lucide-react */
  icon: LucideIcon;
  
  /** Optional text label (makes button adaptive width) */
  children?: React.ReactNode;
  
  /** Loading state - shows spinner */
  loading?: boolean;
  
  /** Accessible label (required for icon-only buttons) */
  'aria-label'?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: Icon,
      children,
      loading = false,
      disabled,
      className = '',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    // Ensure icon-only buttons have aria-label
    if (!children && !ariaLabel && !props['aria-labelledby']) {
      console.warn('IconButton: icon-only buttons should have an aria-label');
    }

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
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'disabled:pointer-events-none',
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
    };

    // Icon-only buttons are square with 1:1 aspect ratio
    // Buttons with text adapt their width
    const sizeClasses: Record<string, string> = {
      sm: children ? 'h-8 px-3 text-sm gap-2' : 'h-8 w-8',
      md: children ? 'h-10 px-4 text-sm gap-2' : 'h-10 w-10',
      lg: children ? 'h-12 px-6 text-base gap-2' : 'h-12 w-12',
    };

    const iconSizeClasses: Record<string, string> = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    };

    const classes = [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        {...props}
      >
        {loading ? (
          <Loader2 className={`${iconSizeClasses[size]} animate-spin`} />
        ) : (
          <Icon className={iconSizeClasses[size]} />
        )}
        {children && <span>{children}</span>}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;

// Register component metadata for the gallery
export const iconButtonMetadata: ComponentMetadata = {
  name: 'IconButton',
  description: 'Button with icon, optionally with text label. Icon-only buttons are square (1:1 aspect ratio)',
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
  ],
  sizes: ['sm', 'md', 'lg'],
  applicableStates: [
    'default',
    'hover',
    'active',
    'focus',
    'loading',
    'disabled',
  ],
  props: [
    {
      name: 'variant',
      type: "'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost'",
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
      name: 'icon',
      type: 'LucideIcon',
      required: true,
      description: 'Icon component from lucide-react',
    },
    {
      name: 'loading',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Shows loading spinner and disables button',
    },
    {
      name: 'children',
      type: 'React.ReactNode',
      required: false,
      description: 'Optional text label. If provided, button width adapts to content',
    },
    {
      name: 'aria-label',
      type: 'string',
      required: false,
      description: 'Accessible label (required for icon-only buttons)',
    },
  ],
  example: `import { Settings } from 'lucide-react';

// Icon only
<IconButton icon={Settings} aria-label="Settings" />

// With text
<IconButton icon={Settings}>
  Settings
</IconButton>`,
  a11y: 'Icon-only buttons MUST have an aria-label for screen readers. Buttons with text labels do not require aria-label.',
};

registerComponent(iconButtonMetadata);

