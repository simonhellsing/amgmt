import React from 'react';

import { useRouter } from 'next/router';
import { ArrowLeft, ChevronRight, X } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  customContent?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  onBackClick?: () => void;
  backButtonHref?: string;
  className?: string;
  useCloseIcon?: boolean;
}

export default function Breadcrumb({ 
  items, 
  showBackButton = false, 
  onBackClick,
  backButtonHref,
  className = "",
  useCloseIcon = false
}: BreadcrumbProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else if (backButtonHref) {
      router.push(backButtonHref);
    } else if (items.length > 1) {
      // Navigate to the second-to-last item
      const previousItem = items[items.length - 2];
      if (previousItem.href) {
        router.push(previousItem.href);
      } else if (previousItem.onClick) {
        previousItem.onClick();
      }
    }
  };

  const handleItemClick = (item: BreadcrumbItem) => {
    if (item.href) {
      router.push(item.href);
    } else if (item.onClick) {
      item.onClick();
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Back Icon Button */}
      {showBackButton && (
        <button
          onClick={handleBackClick}
          className="p-1 hover:bg-gray-600 rounded transition-colors cursor-pointer text-sm font-medium"
        >
          {useCloseIcon ? (
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          ) : (
            <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white" />
          )}
        </button>
      )}
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-lg font-medium">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
                                 <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
            
            {index === items.length - 1 ? (
              // Last item (current page) - not clickable
              <span className="text-white">{item.customContent || item.label}</span>
            ) : (
              // Clickable navigation items
              <button
                onClick={() => handleItemClick(item)}
                className="text-gray-300 hover:text-white hover:bg-gray-600 px-2 py-1 rounded transition-colors cursor-pointer text-lg font-medium"
              >
                {item.customContent || item.label}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
} 