import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Command, Search, X, Mic, Send } from 'lucide-react';
import { useCommandK, useSlashShortcut } from '@/hooks/useHotkeys';
import { CommandContext, SearchResult, TabMode } from '@/types/command-dock';
import { commands, filterCommands } from './commandRegistry';
import { search } from './search';
import { ResultCard } from './ResultCard';
import { useToast } from '@/lib/useToast';
import ToastContainer from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import Modal from '@/components/overlay/Modal';
import AddArtistForm from '@/components/AddArtistForm';
import NewReleaseForm from '@/components/NewReleaseForm';
import NewDeliverableForm from '@/components/NewDeliverableForm';
import { supabase } from '@/lib/supabase';

interface CommandDockProps {
  artistId?: string;
  releaseId?: string;
  organizationId?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onExecute?: (id: string) => void;
}

export const CommandDock: React.FC<CommandDockProps> = ({
  artistId,
  releaseId,
  organizationId,
  onOpen,
  onClose,
  onExecute,
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<TabMode>(() => {
    // Remember last active tab
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('commandDock:lastTab');
      return (saved === 'commands' || saved === 'search') ? saved : 'search';
    }
    return 'search';
  });
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [commandResults, setCommandResults] = useState(commands);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const { toasts, removeToast, success, error: showError } = useToast();
  
  // Modal states
  const [activeModal, setActiveModal] = useState<'artist' | 'release' | 'deliverable' | null>(null);
  const [releaseTitle, setReleaseTitle] = useState<string>('');

  const route = router.pathname;

  // Fetch release title when releaseId changes
  useEffect(() => {
    if (releaseId) {
      const fetchReleaseTitle = async () => {
        const { data, error } = await supabase
          .from('releases')
          .select('title')
          .eq('id', releaseId)
          .single();
        
        if (!error && data) {
          setReleaseTitle(data.title);
        }
      };
      
      fetchReleaseTitle();
    } else {
      setReleaseTitle('');
    }
  }, [releaseId]);

  // Get context for commands
  const getContext = useCallback((): CommandContext => ({
    router,
    artistId,
    releaseId,
    organizationId,
    route,
  }), [router, artistId, releaseId, organizationId, route]);

  // Open modal
  const open = useCallback((defaultTab: TabMode = 'search') => {
    setIsOpen(true);
    setTab(defaultTab);
    setQuery('');
    setSelectedIndex(0);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('commandDock:lastTab', defaultTab);
    }
    
    onOpen?.();
    
    // Analytics stub
    // trackEvent('command_dock_opened', { tab: defaultTab });
  }, [onOpen]);

  // Close modal
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSearchResults([]);
    onClose?.();
    
    // Analytics stub
    // trackEvent('command_dock_closed', { query_length: query.length });
  }, [onClose]);

  // Keyboard shortcuts
  useCommandK(() => open('commands'), !isOpen);
  useSlashShortcut(() => open('search'), !isOpen);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search handler with debounce
  useEffect(() => {
    if (tab === 'search') {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const results = await search(query);
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
    }
  }, [query, tab]);

  // Filter commands when query changes
  useEffect(() => {
    if (tab === 'commands') {
      const filtered = filterCommands(query, getContext());
      setCommandResults(filtered);
      setSelectedIndex(0);
    }
  }, [query, tab, getContext]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults, commandResults]);

  // Get current results list
  const currentResults = tab === 'search' ? searchResults : commandResults;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < currentResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute(selectedIndex);
    }
  };

  // Execute command or navigate to search result
  const handleExecute = async (index: number) => {
    const result = currentResults[index];
    if (!result) return;

    if (tab === 'search') {
      // Navigate to search result
      const searchResult = result as SearchResult;
      router.push(searchResult.href);
      success('Navigating...', searchResult.title);
      close();
      
      // Analytics stub
      // trackEvent('command_dock_search_selected', { type: searchResult.type, query });
    } else {
      // Execute command
      const command = result as typeof commands[0];
      try {
        const resultData = await command.run(query, getContext());
        success(resultData.title, resultData.description);
        close();
        onExecute?.(command.id);
        
        // Analytics stub
        // trackEvent('command_dock_command_executed', { command_id: command.id, query_length: query.length });
      } catch (err) {
        console.error('Command execution error:', err);
        showError('Command failed', 'An error occurred while executing the command');
      }
    }
  };

  // Get context-aware suggestions
  const getContextSuggestions = () => {
    const suggestions: string[] = [];
    
    if (artistId) {
      suggestions.push('Try: "Create release" or search this artist\'s releases');
    }
    if (releaseId) {
      suggestions.push('Try: "Create deliverable" or search assets');
    }
    if (route === '/artists') {
      suggestions.push('Try: "Create artist" to add a new artist');
    }
    if (route === '/releases') {
      suggestions.push('Try: "Create release" to add a new release');
    }
    
    return suggestions;
  };

  // Render empty state
  const renderEmptyState = () => {
    if (tab === 'search') {
      if (query.trim() && !isSearching) {
        return (
          <div className="px-4 py-8 text-center text-gray-400">
            <p className="text-sm">No results found</p>
            <p className="text-xs mt-2">Try using prefixes: <span className="text-gray-300">a:</span> for artists, <span className="text-gray-300">r:</span> for releases</p>
          </div>
        );
      }
      
      const suggestions = getContextSuggestions();
      
      return (
        <div className="px-4 py-8 text-center text-gray-400 space-y-2">
          <p className="text-sm font-medium">Quick tips</p>
          {suggestions.length > 0 && (
            <div className="mb-3 pb-3 border-b border-gray-700">
              {suggestions.map((suggestion, i) => (
                <p key={i} className="text-xs text-gray-300">{suggestion}</p>
              ))}
            </div>
          )}
          <p className="text-xs">• Type to search artists, releases, and assets</p>
          <p className="text-xs">• Use <span className="text-gray-300">a:</span> to search artists only</p>
          <p className="text-xs">• Use <span className="text-gray-300">r:</span> to search releases only</p>
          <p className="text-xs">• Press <span className="text-gray-300">/</span> or <span className="text-gray-300">⌘K</span> to open quickly</p>
        </div>
      );
    } else {
      if (query.trim() && commandResults.length === 0) {
        return (
          <div className="px-4 py-8 text-center text-gray-400">
            <p className="text-sm">No matching commands</p>
          </div>
        );
      }
      
      const suggestions = getContextSuggestions();
      
      return (
        <div className="px-4 py-8 text-center text-gray-400 space-y-2">
          <p className="text-sm font-medium">Available commands</p>
          {suggestions.length > 0 && (
            <div className="mb-3 pb-3 border-b border-gray-700">
              {suggestions.map((suggestion, i) => (
                <p key={i} className="text-xs text-gray-300">{suggestion}</p>
              ))}
            </div>
          )}
          <p className="text-xs">• Type to filter commands</p>
          <p className="text-xs">• Press <span className="text-gray-300">⌘K</span> to open commands</p>
          <p className="text-xs">• Use <span className="text-gray-300">↑/↓</span> to navigate</p>
        </div>
      );
    }
  };

  if (!isOpen) {
    return (
      <>
        {/* Floating button */}
        <button
          onClick={() => open('search')}
          className="
            fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40
            w-12 h-12 rounded-full
            bg-gray-800 hover:bg-gray-700
            border border-gray-600 hover:border-gray-500
            shadow-lg hover:shadow-xl
            flex items-center justify-center
            transition-all duration-200
            group
            cursor-pointer
          "
          aria-label="Open command palette"
          title="Open command palette (⌘K or /)"
        >
          <Command className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
        </button>
        
        {/* Toast container */}
        <ToastContainer toasts={toasts} onClose={removeToast} />

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

        {activeModal === 'release' && (
          <NewReleaseForm
            isOpen={true}
            onClose={() => setActiveModal(null)}
            preselectedArtistId={artistId}
            onReleaseCreated={(release) => {
              setActiveModal(null);
              success('Release created successfully!', release.title);
              router.reload();
            }}
          />
        )}

        {activeModal === 'deliverable' && releaseId && (
          <NewDeliverableForm
            isOpen={true}
            onClose={() => setActiveModal(null)}
            releaseId={releaseId}
            releaseTitle={releaseTitle || 'New Deliverable'}
            onDeliverableCreated={() => {
              setActiveModal(null);
              success('Deliverable created successfully!');
              router.reload();
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Modal backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
        onClick={close}
      >
        {/* Modal dialog */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="relative bg-gray-800 rounded-lg shadow-2xl border border-gray-700 w-full max-w-2xl animate-fade-in-scale"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Row 1: Input field */}
          <div className="relative p-4 border-b border-gray-700">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search or prompt..."
              className="
                w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-md
                text-white placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent
                text-sm
              "
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Row 2: Action area */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            {/* Left side: New buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setActiveModal('artist');
                  close();
                }}
              >
                New Artist
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setActiveModal('release');
                  close();
                }}
              >
                New Release
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!releaseId) {
                    showError('No release selected', 'Please navigate to a release page first');
                    return;
                  }
                  setActiveModal('deliverable');
                  close();
                }}
                disabled={!releaseId}
              >
                New Deliverable
              </Button>
            </div>

            {/* Right side: Icon buttons */}
            <div className="flex items-center gap-2">
              <IconButton
                icon={Mic}
                variant="ghost"
                size="md"
                aria-label="Voice dictation"
                onClick={() => {
                  // TODO: Implement voice dictation
                  success('Voice dictation', 'Feature coming soon');
                }}
              />
              <IconButton
                icon={Send}
                variant="ghost"
                size="md"
                aria-label="Send"
                onClick={() => {
                  if (!query.trim()) return;
                  handleExecute(selectedIndex);
                }}
                disabled={!query.trim() || currentResults.length === 0}
              />
            </div>
          </div>

          {/* Results list */}
          <div
            role="listbox"
            className="max-h-[400px] overflow-y-auto p-2"
          >
            {isSearching && tab === 'search' ? (
              <div className="px-4 py-8 text-center text-gray-400">
                <p className="text-sm">Searching...</p>
              </div>
            ) : currentResults.length > 0 ? (
              <div className="space-y-1">
                {currentResults.map((result, index) => (
                  <ResultCard
                    key={'id' in result ? result.id : `cmd-${index}`}
                    result={result}
                    isSelected={index === selectedIndex}
                    onClick={() => handleExecute(index)}
                    resultType={tab === 'search' ? 'search' : 'command'}
                  />
                ))}
              </div>
            ) : (
              renderEmptyState()
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-400 flex items-center justify-center gap-4">
            <span><span className="text-gray-300">↑↓</span> navigate</span>
            <span><span className="text-gray-300">Enter</span> select</span>
            <span><span className="text-gray-300">Esc</span> close</span>
          </div>
        </div>
      </div>

      {/* Toast container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

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

      {activeModal === 'release' && (
        <NewReleaseForm
          isOpen={true}
          onClose={() => setActiveModal(null)}
          preselectedArtistId={artistId}
          onReleaseCreated={(release) => {
            setActiveModal(null);
            success('Release created successfully!', release.title);
            router.reload();
          }}
        />
      )}

      {activeModal === 'deliverable' && releaseId && (
        <NewDeliverableForm
          isOpen={true}
          onClose={() => setActiveModal(null)}
          releaseId={releaseId}
          releaseTitle={releaseTitle || 'New Deliverable'}
          onDeliverableCreated={() => {
            setActiveModal(null);
            success('Deliverable created successfully!');
            router.reload();
          }}
        />
      )}
    </>
  );
};

export default CommandDock;

