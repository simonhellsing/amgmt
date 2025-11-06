import { useState, useCallback } from 'react';
import { Toast } from '@/components/Toast';

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    type: Toast['type'],
    title: string,
    message?: string,
    duration = 3000
  ) => {
    const id = `toast-${++toastId}`;
    const newToast: Toast = {
      id,
      type,
      title,
      message,
      duration,
    };

    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string) => {
    showToast('success', title, message);
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    showToast('error', title, message);
  }, [showToast]);

  const warning = useCallback((title: string, message?: string) => {
    showToast('warning', title, message);
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    showToast('info', title, message);
  }, [showToast]);

  const showProgressToast = useCallback((
    title: string,
    total: number,
    currentFileName?: string
  ) => {
    const id = `toast-progress-${++toastId}`;
    const newToast: Toast = {
      id,
      type: 'progress',
      title,
      progress: {
        current: 0,
        total,
        currentFileName,
      },
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const updateProgressToast = useCallback((
    id: string,
    current: number,
    currentFileName?: string
  ) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id && toast.type === 'progress'
        ? {
            ...toast,
            progress: {
              ...toast.progress!,
              current,
              currentFileName,
            },
          }
        : toast
    ));
  }, []);

  const completeProgressToast = useCallback((id: string) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id && toast.type === 'progress'
        ? {
            ...toast,
            type: 'success',
            title: toast.title.replace('Uploading', 'Uploaded'),
            duration: 3000,
          }
        : toast
    ));
    // Auto-remove after showing success
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info,
    showProgressToast,
    updateProgressToast,
    completeProgressToast,
  };
}
