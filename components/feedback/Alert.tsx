import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const variantConfig = {
    info: {
      bg: 'bg-blue-50 border-blue-500',
      icon: Info,
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-900',
      textColor: 'text-blue-800',
    },
    success: {
      bg: 'bg-green-50 border-green-500',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      titleColor: 'text-green-900',
      textColor: 'text-green-800',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-500',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      titleColor: 'text-yellow-900',
      textColor: 'text-yellow-800',
    },
    error: {
      bg: 'bg-red-50 border-red-500',
      icon: AlertCircle,
      iconColor: 'text-red-500',
      titleColor: 'text-red-900',
      textColor: 'text-red-800',
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={`relative rounded-lg border-l-4 ${config.bg} p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start">
        <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5 flex-shrink-0`} />
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-semibold ${config.titleColor}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${config.textColor} ${title ? 'mt-1' : ''}`}>
            {children}
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className={`ml-3 flex-shrink-0 ${config.iconColor} hover:opacity-75 transition-opacity`}
            aria-label="Close alert"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;

export const alertMetadata: ComponentMetadata = {
  name: 'Alert',
  description: 'Alert message with icon and optional title and close button',
  category: 'feedback',
  variants: [
    { name: 'info', description: 'Informational message (blue)' },
    { name: 'success', description: 'Success message (green)' },
    { name: 'warning', description: 'Warning message (yellow)' },
    { name: 'error', description: 'Error message (red)' },
  ],
  sizes: ['md'],
  applicableStates: ['default'],
  props: [
    { name: 'variant', type: "'info' | 'success' | 'warning' | 'error'", default: "'info'", required: false, description: 'Alert type' },
    { name: 'title', type: 'string', required: false, description: 'Alert title' },
    { name: 'children', type: 'React.ReactNode', required: true, description: 'Alert content' },
    { name: 'onClose', type: '() => void', required: false, description: 'Close handler (shows close button)' },
  ],
  example: `<Alert variant="success" title="Success!">
  Your changes have been saved.
</Alert>

<Alert variant="error" onClose={() => {}}>
  An error occurred.
</Alert>`,
  a11y: 'Uses role="alert" for screen readers. Close button has aria-label.',
};

registerComponent(alertMetadata);

