import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PageTransitionContextType {
  isTransitioning: boolean;
  setTransitioning: (transitioning: boolean) => void;
  clickedReleaseId: string | null;
  setClickedReleaseId: (id: string | null) => void;
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined);

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setTransitioning] = useState(false);
  const [clickedReleaseId, setClickedReleaseId] = useState<string | null>(null);

  return (
    <PageTransitionContext.Provider
      value={{
        isTransitioning,
        setTransitioning,
        clickedReleaseId,
        setClickedReleaseId,
      }}
    >
      {children}
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition() {
  const context = useContext(PageTransitionContext);
  if (context === undefined) {
    throw new Error('usePageTransition must be used within a PageTransitionProvider');
  }
  return context;
}

