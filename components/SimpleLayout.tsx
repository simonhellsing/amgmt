import React, { useRef, useState } from 'react';
import SimpleNavigation from './SimpleNavigation';
import CommandBar from './command-dock/CommandBar';

interface SimpleLayoutProps {
  children: React.ReactNode;
}

export default function SimpleLayout({ children }: SimpleLayoutProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 0);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <SimpleNavigation isScrolled={isScrolled} />
      {/* Main Content with responsive horizontal padding */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto px-6 lg:px-[16%] pt-20"
      >
        <div className="py-4">
          {children}
        </div>
      </div>
      {/* Command Bar - floating at bottom center */}
      {/* <CommandBar /> */}
    </div>
  );
}
