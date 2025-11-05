import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  warning?: string;
  success?: string;
  helperText?: string;
  showCount?: boolean;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      warning,
      success,
      helperText,
      showCount = false,
      fullWidth = true,
      className = '',
      id,
      disabled,
      value,
      maxLength,
      ...props
    },
    ref
  ) => {
    const inputId = id || `textarea-${React.useId()}`;
    const helperId = `${inputId}-helper`;
    const hasValidation = Boolean(error || warning || success);
    const message = error || warning || success || helperText;

    const baseClasses = [
      'block w-full rounded-md bg-gray-800 border text-white',
      'placeholder-gray-500 transition-all duration-normal',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-900',
      'px-3 py-2 text-sm resize-y min-h-[80px]',
    ].join(' ');

    const stateClasses = error
      ? 'border-red-500 focus:ring-red-500'
      : warning
      ? 'border-yellow-500 focus:ring-yellow-500'
      : success
      ? 'border-green-500 focus:ring-green-500'
      : 'border-gray-700 focus:ring-gray-500';

    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={inputId}
            className={`${baseClasses} ${stateClasses} ${className}`}
            disabled={disabled}
            value={value}
            maxLength={maxLength}
            aria-invalid={hasValidation ? 'true' : undefined}
            aria-describedby={message ? helperId : undefined}
            {...props}
          />
          {hasValidation && (
            <div className="absolute top-2 right-2 pointer-events-none">
              {error && <AlertCircle className="h-5 w-5 text-red-500" />}
              {warning && <AlertCircle className="h-5 w-5 text-yellow-500" />}
              {success && <CheckCircle className="h-5 w-5 text-green-500" />}
            </div>
          )}
        </div>

        {message && (
          <p
            id={helperId}
            className={`mt-1.5 text-sm ${
              error ? 'text-red-500' : warning ? 'text-yellow-500' : success ? 'text-green-500' : 'text-gray-400'
            }`}
          >
            {message}
          </p>
        )}

        {showCount && maxLength && (
          <p className="mt-1 text-xs text-gray-400 text-right">
            {charCount} / {maxLength}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;

export const textareaMetadata: ComponentMetadata = {
  name: 'Textarea',
  description: 'Multi-line text input with validation states',
  category: 'form',
  variants: [{ name: 'default', description: 'Standard textarea' }],
  sizes: ['md'],
  applicableStates: ['default', 'hover', 'focus', 'disabled', 'valid', 'invalid', 'warning'],
  props: [
    { name: 'label', type: 'string', required: false, description: 'Textarea label' },
    { name: 'error', type: 'string', required: false, description: 'Error message' },
    { name: 'warning', type: 'string', required: false, description: 'Warning message' },
    { name: 'success', type: 'string', required: false, description: 'Success message' },
    { name: 'showCount', type: 'boolean', default: 'false', required: false, description: 'Show character count' },
  ],
  example: '<Textarea label="Description" placeholder="Enter description..." maxLength={500} showCount />',
  a11y: 'Labels are properly associated. Error messages linked via aria-describedby.',
};

registerComponent(textareaMetadata);

