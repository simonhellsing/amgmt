import React from 'react';
import { ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  warning?: string;
  success?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      placeholder,
      error,
      warning,
      success,
      helperText,
      size = 'md',
      fullWidth = true,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${React.useId()}`;
    const helperId = `${selectId}-helper`;
    const hasValidation = Boolean(error || warning || success);
    const message = error || warning || success || helperText;

    const baseClasses = [
      'block w-full rounded-md bg-gray-800 border text-white appearance-none',
      'transition-all duration-normal cursor-pointer',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-900',
    ].join(' ');

    const sizeClasses: Record<string, string> = {
      sm: 'h-8 pl-3 pr-10 text-sm',
      md: 'h-10 pl-3 pr-10 text-sm',
      lg: 'h-12 pl-4 pr-12 text-base',
    };

    const stateClasses = error
      ? 'border-red-500 focus:ring-red-500'
      : warning
      ? 'border-yellow-500 focus:ring-yellow-500'
      : success
      ? 'border-green-500 focus:ring-green-500'
      : 'border-gray-700 focus:ring-gray-500';

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-300 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`${baseClasses} ${sizeClasses[size]} ${stateClasses} ${className}`}
            disabled={disabled}
            aria-invalid={hasValidation ? 'true' : undefined}
            aria-describedby={message ? helperId : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none">
            {hasValidation ? (
              <div className="pr-3">
                {error && <AlertCircle className="h-5 w-5 text-red-500" />}
                {warning && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                {success && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400 mr-3" />
            )}
          </div>
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
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;

export const selectMetadata: ComponentMetadata = {
  name: 'Select',
  description: 'Dropdown select with options and validation states',
  category: 'form',
  variants: [{ name: 'default', description: 'Standard select dropdown' }],
  sizes: ['sm', 'md', 'lg'],
  applicableStates: ['default', 'hover', 'focus', 'disabled', 'valid', 'invalid', 'warning', 'open'],
  props: [
    { name: 'label', type: 'string', required: false, description: 'Select label' },
    { name: 'options', type: 'SelectOption[]', required: true, description: 'Array of options' },
    { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", required: false, description: 'Size variant' },
  ],
  example: `<Select 
  label="Country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
  ]}
  placeholder="Select a country"
/>`,
  a11y: 'Uses native select element for maximum accessibility and keyboard support.',
};

registerComponent(selectMetadata);

