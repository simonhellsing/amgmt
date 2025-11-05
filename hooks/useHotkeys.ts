import { useEffect } from 'react';

export type HotkeyHandler = (event: KeyboardEvent) => void;

interface UseHotkeysOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  ignoreInputs?: boolean;
}

/**
 * Hook to bind keyboard shortcuts
 * @param key - The key to listen for (e.g., 'k', '/', 'Escape')
 * @param callback - Function to call when key is pressed
 * @param options - Configuration options
 */
export function useHotkeys(
  key: string,
  callback: HotkeyHandler,
  options: UseHotkeysOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    ignoreInputs = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we should ignore inputs
      if (ignoreInputs) {
        const target = event.target as HTMLElement;
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
        const isContentEditable = target.isContentEditable;
        
        if (isInput || isContentEditable) {
          return;
        }
      }

      // Check for Cmd+K or Ctrl+K
      if (key === 'k' && (event.metaKey || event.ctrlKey)) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
        return;
      }

      // Check for simple key press
      if (event.key === key && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, enabled, preventDefault, ignoreInputs]);
}

/**
 * Hook to handle Cmd/Ctrl + K shortcut specifically
 */
export function useCommandK(callback: HotkeyHandler, enabled = true) {
  return useHotkeys('k', callback, { enabled, preventDefault: true, ignoreInputs: true });
}

/**
 * Hook to handle "/" shortcut specifically
 */
export function useSlashShortcut(callback: HotkeyHandler, enabled = true) {
  return useHotkeys('/', callback, { enabled, preventDefault: true, ignoreInputs: true });
}

