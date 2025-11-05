import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface BlurredHeaderProps {
  imageUrl?: string | null;
  children: React.ReactNode;
  className?: string;
}

export default function BlurredHeader({ imageUrl, children, className = '' }: BlurredHeaderProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [backgroundHeight, setBackgroundHeight] = useState(300);
  const [layoutPreference, setLayoutPreference] = useState<string>('simple');

  useEffect(() => {
    const updateHeight = () => {
      if (contentRef.current) {
        // Use requestAnimationFrame to ensure DOM is fully laid out
        requestAnimationFrame(() => {
          if (contentRef.current) {
            // Get positions for midpoint calculation
            const headerRect = contentRef.current.getBoundingClientRect();
            const headerBottom = headerRect.bottom;
            
            // Find the deliverables section (next sibling after BlurredHeader)
            const deliverablesSection = contentRef.current.nextElementSibling as HTMLElement;
            
            if (deliverablesSection) {
              // Get the top position of the deliverables section
              const deliverablesRect = deliverablesSection.getBoundingClientRect();
              const deliverablesTop = deliverablesRect.top;
              
              // Calculate the midpoint between header bottom and deliverables top
              // This is the distance from viewport top (where fixed background starts) to the midpoint
              const midpoint = headerBottom + (deliverablesTop - headerBottom) / 2;
              setBackgroundHeight(midpoint);
            } else {
              // Use the actual height of the blurred-header-full-width div
              // Since background is fixed at top: 0, we need the distance from viewport top to bottom of header
              // Use offsetHeight + top position to get the absolute bottom position
              const headerTop = headerRect.top;
              const headerHeight = contentRef.current.offsetHeight;
              setBackgroundHeight(headerTop + headerHeight);
            }
          }
        });
      }
    };

    // Initial measurement with a small delay to ensure content is rendered
    const timeoutId = setTimeout(updateHeight, 0);
    window.addEventListener('resize', updateHeight);
    
    // Use MutationObserver to watch for content changes
    const observer = new MutationObserver(updateHeight);
    if (contentRef.current) {
      observer.observe(contentRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, [children]);

  // Detect layout preference
  useEffect(() => {
    const fetchLayoutPreference = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData, error } = await supabase
          .from('user_profiles')
          .select('layout_preference')
          .eq('id', user.id)
          .single();

        if (!error && profileData) {
          setLayoutPreference(profileData.layout_preference || 'simple');
        }
      } catch (error) {
        console.error('Error fetching layout preference:', error);
      }
    };

    fetchLayoutPreference();

    const handlePreferenceChange = () => {
      fetchLayoutPreference();
    };
    window.addEventListener('layoutPreferenceChanged', handlePreferenceChange);

    return () => {
      window.removeEventListener('layoutPreferenceChanged', handlePreferenceChange);
    };
  }, []);

  // Determine margins based on layout mode
  const isComplexMode = layoutPreference === 'complex';
  const containerStyle = isComplexMode
    ? {
        backgroundColor: 'transparent',
        marginTop: 'calc(-32px)',
        marginBottom: '0',
        marginLeft: '-80px',
        marginRight: '-80px',
        width: 'calc(100% + 160px)',
        maxWidth: 'calc(100vw - 272px)',
        position: 'relative' as const,
        zIndex: 1,
        overflow: 'hidden'
      }
    : {
        backgroundColor: 'transparent',
        marginTop: 'calc(-80px - 16px)',
        marginBottom: '0',
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        width: '100vw',
        position: 'relative' as const,
        zIndex: 1
      };

  const backgroundStyle = isComplexMode
    ? {
        position: 'absolute' as const,
        left: '0',
        right: '0',
        top: 0,
        height: `${backgroundHeight}px`,
        width: '100%',
        zIndex: 0,
        pointerEvents: 'none' as const,
        willChange: 'height'
      }
    : {
        position: 'absolute' as const,
        left: 'calc(-50vw + 50%)',
        right: 'calc(-50vw + 50%)',
        top: 0,
        height: `${backgroundHeight}px`,
        width: '100vw',
        zIndex: 0,
        pointerEvents: 'none' as const,
        willChange: 'height'
      };

  return (
    <div 
      ref={contentRef}
      className={`blurred-header-full-width ${className}`}
      style={containerStyle}
    >
      {/* Background wrapper - extends full width behind nav with absolute positioning */}
      <div 
        className="absolute overflow-hidden"
        style={backgroundStyle}
      >
        {/* Background Image */}
        {imageUrl && (
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(50px)',
              opacity: 0.8,
              transform: 'scale(1.2)'
            }}
          />
        )}
        
        {/* Fallback background */}
        {!imageUrl && (
          <div 
            className="absolute inset-0"
            style={{
              backgroundColor: '#383838'
            }}
          />
        )}
        
        {/* Dark overlay */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)'
          }}
        />
      </div>
      
      {/* Content */}
      <div 
        className={`relative z-10 py-8 ${isComplexMode ? '' : 'px-6 lg:px-[16%]'}`}
        style={{
          backgroundColor: 'transparent',
          color: 'white',
          paddingTop: '20px',
          ...(isComplexMode ? { paddingLeft: '80px', paddingRight: '80px' } : {})
        }}
      >
        {children}
      </div>
    </div>
  );
}
