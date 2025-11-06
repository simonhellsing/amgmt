import React, { useEffect, useState } from 'react';
import { X, Check, AlertCircle, Info, Trash2, Upload } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'progress';
  title: string;
  message?: string;
  icon?: React.ReactNode;
  duration?: number;
  progress?: {
    current: number;
    total: number;
    currentFileName?: string;
  };
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Don't auto-close progress toasts
    if (toast.duration && toast.type !== 'progress') {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.type]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const getIconAndColors = () => {
    if (toast.icon) {
      return {
        icon: toast.icon,
        bgColor: 'bg-gray-800',
        borderColor: 'border-gray-600',
      };
    }

    switch (toast.type) {
      case 'success':
        return {
          icon: <Check className="w-5 h-5 text-green-400" />,
          bgColor: 'bg-gray-800',
          borderColor: 'border-green-400',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-400" />,
          bgColor: 'bg-gray-800',
          borderColor: 'border-red-400',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-5 h-5 text-yellow-400" />,
          bgColor: 'bg-gray-800',
          borderColor: 'border-yellow-400',
        };
      case 'info':
        return {
          icon: <Info className="w-5 h-5 text-blue-400" />,
          bgColor: 'bg-gray-800',
          borderColor: 'border-blue-400',
        };
      case 'progress':
        return {
          icon: <Upload className="w-5 h-5 text-blue-400 animate-pulse" />,
          bgColor: 'bg-gray-800',
          borderColor: 'border-blue-400',
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-gray-400" />,
          bgColor: 'bg-gray-800',
          borderColor: 'border-gray-600',
        };
    }
  };

  const { icon, bgColor, borderColor } = getIconAndColors();

  return (
    <div
      className={`
        ${bgColor} ${borderColor} border rounded-lg p-4 shadow-lg max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100' 
          : isLeaving 
          ? 'translate-x-full opacity-0' 
          : 'translate-x-full opacity-0'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm">{toast.title}</p>
          {toast.message && (
            <p className="text-gray-300 text-sm mt-1">{toast.message}</p>
          )}
          {toast.progress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>
                  {toast.progress.currentFileName || `File ${toast.progress.current} of ${toast.progress.total}`}
                </span>
                <span>
                  {toast.progress.total > 0 
                    ? `${Math.round((toast.progress.current / toast.progress.total) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-400 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ 
                    width: toast.progress.total > 0
                      ? `${Math.min(100, (toast.progress.current / toast.progress.total) * 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleClose}
          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;