import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon: LucideIcon;
  children?: React.ReactNode;
  loading?: boolean;
}

export default function IconButton({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  children,
  loading = false,
  disabled,
  className = '',
  ...props
}: IconButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  
  const variantClasses = {
    primary: 'bg-white hover:bg-gray-100 text-gray-900 focus:ring-gray-500',
    secondary: 'bg-gray-600 hover:bg-gray-500 text-white focus:ring-gray-500',
    tertiary: 'bg-transparent hover:bg-gray-100 text-gray-700 border border-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost: 'text-white border-0 focus:ring-gray-500'
  };

  // Icon-only buttons should be square and match text button heights
  // Buttons with text should adapt their width to content
  const sizeClasses = {
    sm: children ? 'h-8 px-3 py-1.5 text-sm' : 'h-8 w-8', // Icon-only: square, With text: adaptive width + text size
    md: children ? 'h-10 px-4 py-2 text-sm' : 'h-10 w-10',
    lg: children ? 'h-12 px-6 py-3 text-sm' : 'h-12 w-12'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
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
      <Icon className={iconSizeClasses[size]} />
      {children && (
        <span className="ml-2">{children}</span>
      )}
    </button>
  );
} 