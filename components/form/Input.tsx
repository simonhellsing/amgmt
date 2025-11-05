import React from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label */
  label?: string;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Error message */
  error?: string;
  
  /** Warning message */
  warning?: string;
  
  /** Success message */
  success?: string;
  
  /** Helper text */
  helperText?: string;
  
  /** Show character count (requires maxLength) */
  showCount?: boolean;
  
  /** Full width */
  fullWidth?: boolean;
  
  /** Show password toggle (for type="password") */
  showPasswordToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      size = 'md',
      error,
      warning,
      success,
      helperText,
      showCount = false,
      fullWidth = true,
      showPasswordToggle = false,
      className = '',
      id,
      type = 'text',
      disabled,
      value,
      maxLength,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || `input-${React.useId()}`;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const hasValidation = Boolean(error || warning || success);
    const message = error || warning || success || helperText;

    const baseClasses = [
      'block',
      'w-full',
      'rounded-md',
      'bg-gray-800',
      'border',
      'text-white',
      'placeholder-gray-500',
      'transition-all',
      'duration-normal',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-0',
      'disabled:opacity-50',
      'disabled:cursor-not-allowed',
      'disabled:bg-gray-900',
    ].join(' ');

    const sizeClasses: Record<string, string> = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base',
    };

    const stateClasses = error
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
      : warning
      ? 'border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500'
      : success
      ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
      : 'border-gray-700 focus:ring-gray-500 focus:border-gray-500';

    const widthClasses = fullWidth ? 'w-full' : '';

    const inputClasses = [
      baseClasses,
      sizeClasses[size],
      stateClasses,
      showPasswordToggle && type === 'password' ? 'pr-10' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const inputType = showPasswordToggle && showPassword ? 'text' : type;

    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={inputClasses}
            disabled={disabled}
            value={value}
            maxLength={maxLength}
            aria-invalid={hasValidation ? 'true' : undefined}
            aria-describedby={
              message
                ? error
                  ? errorId
                  : helperId
                : undefined
            }
            {...props}
          />

          {/* Validation icon */}
          {hasValidation && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              {error && <AlertCircle className="h-5 w-5 text-red-500" />}
              {warning && <AlertCircle className="h-5 w-5 text-yellow-500" />}
              {success && <CheckCircle className="h-5 w-5 text-green-500" />}
            </div>
          )}

          {/* Password toggle */}
          {showPasswordToggle && type === 'password' && !hasValidation && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        {/* Helper text / error / warning / success message */}
        {message && (
          <p
            id={error ? errorId : helperId}
            className={`mt-1.5 text-sm ${
              error
                ? 'text-red-500'
                : warning
                ? 'text-yellow-500'
                : success
                ? 'text-green-500'
                : 'text-gray-400'
            }`}
          >
            {message}
          </p>
        )}

        {/* Character count */}
        {showCount && maxLength && (
          <p className="mt-1 text-xs text-gray-400 text-right">
            {charCount} / {maxLength}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

// Register component metadata
export const inputMetadata: ComponentMetadata = {
  name: 'Input',
  description: 'Text input field with label, validation states, and helper text',
  category: 'form',
  variants: [
    {
      name: 'default',
      description: 'Standard input field',
    },
  ],
  sizes: ['sm', 'md', 'lg'],
  applicableStates: [
    'default',
    'hover',
    'focus',
    'disabled',
    'valid',
    'invalid',
    'warning',
  ],
  props: [
    {
      name: 'label',
      type: 'string',
      required: false,
      description: 'Input label',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      default: "'md'",
      required: false,
      description: 'Size variant',
    },
    {
      name: 'error',
      type: 'string',
      required: false,
      description: 'Error message (shows red border and error text)',
    },
    {
      name: 'warning',
      type: 'string',
      required: false,
      description: 'Warning message (shows yellow border)',
    },
    {
      name: 'success',
      type: 'string',
      required: false,
      description: 'Success message (shows green border)',
    },
    {
      name: 'helperText',
      type: 'string',
      required: false,
      description: 'Helper text shown below input',
    },
    {
      name: 'showCount',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Show character count (requires maxLength)',
    },
    {
      name: 'showPasswordToggle',
      type: 'boolean',
      default: 'false',
      required: false,
      description: 'Show password visibility toggle (for type="password")',
    },
    {
      name: 'fullWidth',
      type: 'boolean',
      default: 'true',
      required: false,
      description: 'Makes input full width',
    },
  ],
  example: `<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  required
/>

<Input
  label="Password"
  type="password"
  showPasswordToggle
  error="Password must be at least 8 characters"
/>`,
  a11y: 'Labels are properly associated with inputs via htmlFor. Error messages are linked via aria-describedby. Invalid inputs have aria-invalid="true".',
};

registerComponent(inputMetadata);

