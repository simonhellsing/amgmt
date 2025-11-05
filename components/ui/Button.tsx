import React from 'react';
import { Loader2 } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost' | 'link';
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Button content */
  children: React.ReactNode;
  
  /** Loading state - shows spinner */
  loading?: boolean;
  
  /** Success state - can show checkmark or success styling */
  success?: boolean;
  
  /** Error state */
  error?: boolean;
  
  /** Full width */
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      children,
      loading = false,
      success = false,
      error = false,
      fullWidth = false,
      disabled,
      className = '',
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

    // Success state styling
    const successClasses = success
      ? 'bg-green-600 hover:bg-green-700 text-white'
      : '';

    // Error state styling
    const errorClasses = error
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : '';

    const widthClasses = fullWidth ? 'w-full' : '';

    const classes = [
      baseClasses,
      successClasses || errorClasses || variantClasses[variant],
      finalSizeClasses,
      widthClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

// Register component metadata for the gallery
export const buttonMetadata: ComponentMetadata = {
  name: 'Button',
  description: 'Primary action component for user interactions',
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
    'loading',
    'disabled',
    'success',
    'error',
  ],
  props: [
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
      name: 'loading',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Shows loading spinner and disables button',
    },
    {
      name: 'success',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Success state with green styling',
    },
    {
      name: 'error',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Error state with red styling',
    },
    {
      name: 'disabled',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Disabled state',
    },
    {
      name: 'fullWidth',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Makes button full width',
    },
    {
      name: 'children',
      type: 'React.ReactNode',
      required: true,
      description: 'Button content',
    },
  ],
  example: `<Button variant="primary" size="md">
  Click me
</Button>

<Button variant="destructive" loading>
  Loading...
</Button>`,
  a11y: 'Buttons should have descriptive text or aria-label. Disabled buttons are not keyboard accessible.',
};

registerComponent(buttonMetadata);

