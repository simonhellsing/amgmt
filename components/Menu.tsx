import React, { useEffect, useRef } from 'react';

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
}

export default function Menu({ isOpen, onClose, items, position = 'bottom', align = 'left', className = '' }: MenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on the trigger button
      const target = event.target as Node;
      const triggerButton = menuRef.current?.parentElement?.querySelector('button');
      
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClasses = position === 'top' 
    ? 'bottom-full mb-1' 
    : 'top-full mt-1';

  const alignClasses = align === 'right' 
    ? 'right-0' 
    : 'left-0';

  return (
    <div 
      ref={menuRef}
      className={`absolute ${alignClasses} bg-gray-700 rounded-md shadow-lg z-[9999] min-w-fit ${positionClasses} ${className}`}
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
} 