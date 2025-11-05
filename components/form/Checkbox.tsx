import React from 'react';
import { Check, Minus } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, helperText, error, indeterminate = false, size = 'md', className = '', id, disabled, checked, ...props }, ref) => {
    const checkboxId = id || `checkbox-${React.useId()}`;
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const sizeClasses: Record<string, { box: string; icon: string; text: string }> = {
      sm: { box: 'h-4 w-4', icon: 'h-3 w-3', text: 'text-sm' },
      md: { box: 'h-5 w-5', icon: 'h-4 w-4', text: 'text-sm' },
      lg: { box: 'h-6 w-6', icon: 'h-5 w-5', text: 'text-base' },
    };

    const stateClasses = error
      ? 'border-red-500 focus-within:ring-red-500'
      : 'border-gray-600 focus-within:ring-gray-500';

    return (
      <div className={className}>
        <div className="flex items-start">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="checkbox"
              id={checkboxId}
              className="peer sr-only"
              disabled={disabled}
              checked={checked}
              {...props}
            />
            <div
              className={`${sizeClasses[size].box} rounded border-2 ${stateClasses} 
                bg-gray-800 transition-all duration-normal cursor-pointer
                peer-checked:bg-white peer-checked:border-white
                peer-indeterminate:bg-white peer-indeterminate:border-white
                peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-900
                peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
                flex items-center justify-center`}
            >
              {(checked || indeterminate) && (
                <span className="text-gray-900">
                  {indeterminate ? (
                    <Minus className={sizeClasses[size].icon} strokeWidth={3} />
                  ) : (
                    <Check className={sizeClasses[size].icon} strokeWidth={3} />
                  )}
                </span>
              )}
            </div>
          </div>

          {(label || helperText) && (
            <div className="ml-3">
              {label && (
                <label
                  htmlFor={checkboxId}
                  className={`font-medium text-gray-300 cursor-pointer ${sizeClasses[size].text} ${
                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {label}
                </label>
              )}
              {helperText && <p className="text-sm text-gray-400 mt-0.5">{helperText}</p>}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;

export const checkboxMetadata: ComponentMetadata = {
  name: 'Checkbox',
  description: 'Checkbox input with label and indeterminate state support',
  category: 'form',
  variants: [{ name: 'default', description: 'Standard checkbox' }],
  sizes: ['sm', 'md', 'lg'],
  applicableStates: ['default', 'hover', 'focus', 'disabled', 'selected', 'unselected', 'indeterminate', 'invalid'],
  props: [
    { name: 'label', type: 'string', required: false, description: 'Checkbox label' },
    { name: 'indeterminate', type: 'boolean', default: 'false', required: false, description: 'Indeterminate state' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", required: false, description: 'Size variant' },
  ],
  example: '<Checkbox label="Accept terms" />\n<Checkbox label="Select all" indeterminate />',
  a11y: 'Uses native checkbox input with custom styling. Label properly associated via htmlFor.',
};

registerComponent(checkboxMetadata);

