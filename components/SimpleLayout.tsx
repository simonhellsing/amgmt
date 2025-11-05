import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SimpleNavigation from './SimpleNavigation';
import CommandBar from './command-dock/CommandBar';
import AddArtistForm from './AddArtistForm';
import NewReleaseForm from './NewReleaseForm';
import NewDeliverableForm from './NewDeliverableForm';
import Modal from './overlay/Modal';
import { Plus, Users, Music, FileText } from 'lucide-react';

interface SimpleLayoutProps {
  children: React.ReactNode;
}

export default function SimpleLayout({ children }: SimpleLayoutProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [activeModal, setActiveModal] = useState<'artist' | 'release' | 'deliverable' | null>(null);
  
  // Check if we're on a release detail page for deliverable option
  const isReleaseDetailPage = router.pathname.startsWith('/releases/') && router.query.id;
  const currentReleaseId = isReleaseDetailPage ? router.query.id as string : null;

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 0);
    }
  };

  // Click outside handler for Add menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInButton = addButtonRef.current && addButtonRef.current.contains(target);
      const clickedInMenu = addMenuRef.current && addMenuRef.current.contains(target);
      
      if (!clickedInButton && !clickedInMenu) {
        setShowAddMenu(false);
      }
    };

    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddMenu]);

  const handleMenuAction = (action: 'artist' | 'release' | 'deliverable') => {
    setShowAddMenu(false);
    setActiveModal(action);
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
      
      {/* Floating Add Button */}
      <div className="fixed z-50" style={{ bottom: '24px', right: '24px' }}>
        <button
          ref={addButtonRef}
          onClick={() => setShowAddMenu(!showAddMenu)}
          className={`
            w-16 h-16 rounded-full
            flex items-center justify-center
            transition-all duration-200
            shadow-lg
            ${showAddMenu
              ? 'bg-white text-gray-900 hover:bg-gray-100'
              : 'bg-white text-gray-900 hover:bg-gray-100'
            }
          `}
          aria-label="Add new item"
        >
          <Plus className="w-8 h-8" />
        </button>

        {/* Flyout Menu - Opens above button */}
        {showAddMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowAddMenu(false)}
            />
            {/* Menu */}
            <div 
              ref={addMenuRef}
              className="absolute w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
              style={{ bottom: 'calc(100% + 24px)', right: '0px' }}
            >
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Quick Actions
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => handleMenuAction('artist')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors duration-75 cursor-pointer text-gray-300 hover:bg-gray-700 hover:text-white group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-900 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-400 group-hover:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">Add Artist</div>
                      <div className="text-xs text-gray-500">Create a new artist</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleMenuAction('release')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors duration-75 cursor-pointer text-gray-300 hover:bg-gray-700 hover:text-white group"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-900 flex items-center justify-center">
                      <Music className="w-4 h-4 text-gray-400 group-hover:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">Add Release</div>
                      <div className="text-xs text-gray-500">Create a new release</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleMenuAction('deliverable')}
                    disabled={!currentReleaseId}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg transition-colors duration-75 cursor-pointer group ${
                      currentReleaseId
                        ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        : 'text-gray-500 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-gray-900 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-400 group-hover:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">Add Deliverable</div>
                      <div className="text-xs text-gray-500">
                        {currentReleaseId ? 'Create a new deliverable' : 'Navigate to a release first'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {activeModal === 'artist' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Create Artist"
          size="lg"
        >
          <AddArtistForm
            onClose={() => setActiveModal(null)}
            onArtistCreated={() => {
              setActiveModal(null);
              router.reload();
            }}
          />
        </Modal>
      )}

      {activeModal === 'release' && (
        <NewReleaseForm
          isOpen={true}
          onClose={() => setActiveModal(null)}
          preselectedArtistId={undefined}
          onReleaseCreated={(release) => {
            setActiveModal(null);
            router.reload();
          }}
        />
      )}

      {activeModal === 'deliverable' && currentReleaseId && (
        <NewDeliverableForm
          isOpen={true}
          onClose={() => setActiveModal(null)}
          releaseId={currentReleaseId}
          releaseTitle="New Deliverable"
          onDeliverableCreated={() => {
            setActiveModal(null);
            router.reload();
          }}
        />
      )}
    </div>
  );
}
