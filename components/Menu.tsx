import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface MenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
  position?: 'top' | 'bottom';
  align?: 'left' | 'right';
  className?: string;
  triggerRef?: React.RefObject<HTMLElement>;
  triggerId?: string;
}

export default function Menu({ isOpen, onClose, items, position = 'bottom', align = 'left', className = '', triggerRef, triggerId }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on the trigger button or menu
      const target = event.target as Node;
      const triggerButton = triggerRef?.current;
      
      if (menuRef.current && !menuRef.current.contains(target) && !triggerButton?.contains(target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Calculate position to keep menu within viewport (using portal, so position relative to trigger button)
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  
  useEffect(() => {
    if (!isOpen) {
      setMenuStyle({});
      setTriggerRect(null);
      return;
    }

    // Find the trigger button using the ref or by data attribute
    const triggerButton = triggerRef?.current;
    let button: HTMLElement | null = triggerButton || null;
    
    if (!button && triggerId) {
      // Find button by data attribute with specific ID
      button = document.querySelector(`[data-menu-trigger="${triggerId}"]`) as HTMLElement;
    }
    
    if (!button) {
      // Last resort: find any button with data-menu-trigger
      button = document.querySelector('[data-menu-trigger]') as HTMLElement;
    }
    
    if (!button) return;

    // Get trigger button position
    const rect = button.getBoundingClientRect();
    setTriggerRect(rect);

    // Use requestAnimationFrame to ensure menu is rendered before calculating position
    const updatePosition = () => {
      if (!menuRef.current || !triggerRect) return;
      
      const menu = menuRef.current;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const style: React.CSSProperties = {
        position: 'fixed',
        top: position === 'bottom' ? `${triggerRect.bottom + 4}px` : `${triggerRect.top - menu.offsetHeight - 4}px`,
        left: align === 'left' ? `${triggerRect.left}px` : `${triggerRect.right - menu.offsetWidth}px`,
      };

      // Check if menu goes beyond right edge
      if (align === 'left') {
        const rightEdge = triggerRect.left + menu.offsetWidth;
        if (rightEdge > viewportWidth) {
          // Shift left to keep within viewport
          style.left = `${viewportWidth - menu.offsetWidth - 8}px`;
        }
      } else {
        const leftEdge = triggerRect.right - menu.offsetWidth;
        if (leftEdge < 0) {
          // Shift right to keep within viewport
          style.left = '8px';
        }
      }

      // Check if menu goes beyond bottom edge
      if (position === 'bottom') {
        const bottomEdge = triggerRect.bottom + menu.offsetHeight + 4;
        if (bottomEdge > viewportHeight) {
          // Show above instead
          style.top = `${triggerRect.top - menu.offsetHeight - 4}px`;
        }
      } else {
        const topEdge = triggerRect.top - menu.offsetHeight - 4;
        if (topEdge < 0) {
          // Show below instead
          style.top = `${triggerRect.bottom + 4}px`;
        }
      }

      setMenuStyle(style);
    };

    // Wait for next frame to ensure menu is rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(updatePosition);
    });
  }, [isOpen, align, position, triggerRect]);

  if (!isOpen) return null;

  const menuContent = (
    <div 
      ref={menuRef}
      className={`bg-gray-700 rounded-md shadow-lg min-w-fit ${className}`}
      style={{ ...menuStyle, zIndex: 10001 }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={item.onClick}
          disabled={item.disabled}
          className={`w-full text-left px-4 py-2 transition-colors whitespace-nowrap flex items-center ${
            item.disabled 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-white hover:bg-gray-900'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );

  // Use portal to render menu at body level to avoid clipping
  if (typeof window !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return menuContent;
} 