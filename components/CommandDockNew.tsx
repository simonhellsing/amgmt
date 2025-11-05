import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Plus, X } from 'lucide-react';
import { useCommandK, useSlashShortcut } from '@/hooks/useHotkeys';
import { CommandContext, SearchResult } from '@/types/command-dock';
import { search } from '@/components/command-dock/search';
import { ResultCard } from '@/components/command-dock/ResultCard';
import { useToast } from '@/lib/useToast';
import ToastContainer from '@/components/Toast';
import Modal from '@/components/overlay/Modal';
import AddArtistForm from '@/components/AddArtistForm';
import NewReleaseForm from '@/components/NewReleaseForm';
import Menu from '@/components/Menu';

interface CommandDockNewProps {
  artistId?: string;
  releaseId?: string;
  organizationId?: string;
}

const CommandDockNew: React.FC<CommandDockNewProps> = ({
  artistId,
  releaseId,
  organizationId,
}) => {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [activeModal, setActiveModal] = useState<'artist' | 'release' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsDropdownRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const { toasts, removeToast, success, error: showError } = useToast();

  const route = router.pathname;

  // Get context for commands
  const getContext = (): CommandContext => ({
    router,
    artistId,
    releaseId,
    organizationId,
    route,
  });

  // Focus input with keyboard shortcuts
  useCommandK(() => {
    inputRef.current?.focus();
    setShowResults(true);
  }, !showResults);

  useSlashShortcut(() => {
    inputRef.current?.focus();
    setShowResults(true);
  }, !showResults);

  // Search handler with debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!input.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await search(input);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [input]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      const clickedInDock = dockRef.current && dockRef.current.contains(target);
      const clickedInResults = resultsDropdownRef.current && resultsDropdownRef.current.contains(target);
      
      if (!clickedInDock && !clickedInResults) {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setInput('');
      setShowResults(false);
      inputRef.current?.blur();
    } else if (showResults && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults.length > 0) {
          handleExecute(selectedIndex);
        }
      }
    }
  };

  // Navigate to search result
  const handleExecute = async (index: number) => {
    const result = searchResults[index];
    if (!result) return;

    router.push(result.href);
    success('Navigating...', result.title);
    setInput('');
    setShowResults(false);
  };

  return (
    <>
      {/* Floating dock at bottom center */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
        <div ref={dockRef} className="relative w-[400px]">
          {/* Results dropdown */}
          {showResults && (
            <div ref={resultsDropdownRef} className="absolute bottom-full left-0 right-0 mb-2">
              <div className="bg-gray-800 rounded-xl border border-gray-700 max-h-80 overflow-y-auto shadow-lg">
                {isSearching ? (
                  <div className="px-4 py-8 text-center text-gray-400">
                    <p className="text-sm">Searching...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="p-2">
                    {searchResults.map((result, index) => (
                      <ResultCard
                        key={result.id}
                        result={result}
                        isSelected={index === selectedIndex}
                        onClick={() => handleExecute(index)}
                        resultType="search"
                      />
                    ))}
                  </div>
                ) : input.trim() ? (
                  <div className="px-4 py-8 text-center text-gray-400">
                    <p className="text-sm">No results found</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className={`
            bg-gray-700/90 backdrop-blur-md rounded-lg border flex items-center transition-colors duration-75
            ${showResults || input ? 'border-gray-600' : 'border-gray-700'}
            shadow-lg p-1.5
          `}>
            <div className="pl-2 pr-2 w-full">
              <div className="flex items-center gap-2">
                <span className="
                  flex-shrink-0
                  px-2 py-0.5
                  bg-gray-600/50 border border-gray-500/50
                  rounded text-xs
                  text-gray-300 font-medium
                  font-mono
                ">
                  ⌘K
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowResults(true)}
                  placeholder="Search artists, releases, deliverables..."
                  className="
                    min-w-0 flex-1 bg-transparent border-none outline-none
                    text-white placeholder-gray-400 text-sm
                    focus:ring-0 focus:outline-none
                  "
                />
                {input && (
                  <button
                    onClick={() => {
                      setInput('');
                      inputRef.current?.focus();
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-75 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* New button inside input */}
            <div className="relative border-l border-gray-700 px-2">
              <button
                ref={newButtonRef}
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="
                  h-8 px-2.5 rounded
                  bg-white hover:bg-gray-100
                  flex items-center gap-1
                  transition-all duration-200
                  text-gray-900 text-sm font-medium
                  cursor-pointer
                "
              >
                <Plus className="w-3 h-3" />
                New
              </button>

              {/* New menu */}
              {showNewMenu && (
                <div className="absolute bottom-full right-0 mb-2">
                  <Menu
                    isOpen={showNewMenu}
                    onClose={() => setShowNewMenu(false)}
                    items={[
                      {
                        label: 'New Artist',
                        onClick: () => {
                          setShowNewMenu(false);
                          setActiveModal('artist');
                        },
                      },
                      {
                        label: 'New Release',
                        onClick: () => {
                          setShowNewMenu(false);
                          setActiveModal('release');
                        },
                      },
                    ]}
                    position="top"
                    align="right"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
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
              success('Artist created successfully!');
              router.reload();
            }}
          />
        </Modal>
      )}

      <NewReleaseForm
        isOpen={activeModal === 'release'}
        onClose={() => setActiveModal(null)}
        preselectedArtistId={artistId}
        onReleaseCreated={(release) => {
          setActiveModal(null);
          success('Release created successfully!', release.title);
          router.reload();
        }}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};

export default CommandDockNew;

