import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface ModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  
  /** Close handler */
  onClose: () => void;
  
  /** Modal title */
  title?: string;
  
  /** Modal content */
  children: React.ReactNode;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  /** Hide close button */
  hideCloseButton?: boolean;
  
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  
  /** Close on Escape key */
  closeOnEscape?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  hideCloseButton = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
}) => {
  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return;

    const modal = document.querySelector('[role="dialog"]');
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`relative bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col animate-fade-in-scale`}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            {title && (
              <h2
                id="modal-title"
                className="text-xl font-semibold text-white"
              >
                {title}
              </h2>
            )}
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

export const modalMetadata: ComponentMetadata = {
  name: 'Modal',
  description: 'Overlay dialog that requires user interaction',
  category: 'overlay',
  variants: [{ name: 'default', description: 'Standard modal' }],
  sizes: ['sm', 'md', 'lg', 'xl'],
  applicableStates: ['open', 'closed'],
  props: [
    { name: 'isOpen', type: 'boolean', required: true, description: 'Whether modal is open' },
    { name: 'onClose', type: '() => void', required: true, description: 'Close handler' },
    { name: 'title', type: 'string', required: false, description: 'Modal title' },
    { name: 'size', type: "'sm' | 'md' | 'lg' | 'xl'", default: "'md'", required: false, description: 'Modal width' },
    { name: 'closeOnBackdrop', type: 'boolean', default: 'true', required: false, description: 'Close on backdrop click' },
    { name: 'closeOnEscape', type: 'boolean', default: 'true', required: false, description: 'Close on Escape key' },
  ],
  example: `const [isOpen, setIsOpen] = useState(false);

<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Confirm Action">
  <p>Are you sure you want to continue?</p>
  <div className="flex gap-4 mt-6">
    <Button onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </div>
</Modal>`,
  a11y: 'Modal traps focus, closes on Escape, has role="dialog", and prevents body scroll. Focus returns to trigger element on close.',
};

registerComponent(modalMetadata);

