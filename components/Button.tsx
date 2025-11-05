import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  loading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  
  const variantClasses = {
    primary: 'bg-white hover:bg-gray-100 text-gray-900 focus:ring-gray-500',
    secondary: 'bg-transparent hover:bg-gray-600 text-white focus:ring-gray-500',
    tertiary: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 focus:ring-gray-500',
    danger: 'bg-transparent hover:bg-red-600 text-white focus:ring-red-500',
    ghost: 'text-white border-0 focus:ring-gray-500'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-sm'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  // Add custom styles for ghost variant
  const ghostStyles = variant === 'ghost' ? {
    backgroundColor: 'transparent',
    border: 'none'
  } : {};

  return (
    <button
      className={classes}
      style={ghostStyles}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (variant === 'ghost') {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.24)';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'ghost') {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      {...props}
    >
      {loading && (
        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
      )}
      {children}
    </button>
  );
} 