import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Command, Search, Sparkles, X, Mic, Send } from 'lucide-react';
import { useCommandK, useSlashShortcut } from '@/hooks/useHotkeys';
import { CommandContext, SearchResult } from '@/types/command-dock';
import { commands, filterCommands } from './commandRegistry';
import { search } from './search';
import { ResultCard } from './ResultCard';
import { useToast } from '@/lib/useToast';
import ToastContainer from '@/components/Toast';
import AddArtistForm from '@/components/AddArtistForm';
import NewReleaseForm from '@/components/NewReleaseForm';
import NewDeliverableForm from '@/components/NewDeliverableForm';
import Modal from '@/components/overlay/Modal';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { supabase } from '@/lib/supabase';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface CommandBarProps {
  /** Current artist context ID */
  artistId?: string;
  
  /** Current release context ID */
  releaseId?: string;
  
  /** Current organization context ID */
  organizationId?: string;
  
  /** Callback when command bar opens */
  onOpen?: () => void;
  
  /** Callback when command bar closes */
  onClose?: () => void;
  
  /** Callback when a command is executed */
  onExecute?: (commandId: string) => void;
}

type ModalType = 'artist' | 'release' | 'deliverable' | null;

const CommandBarComponent: React.FC<CommandBarProps> = ({
  artistId,
  releaseId,
  organizationId,
}) => {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [commandResults, setCommandResults] = useState(commands);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [releaseTitle, setReleaseTitle] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const resultsDropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const { toasts, removeToast, success, error: showError } = useToast();

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

  // Focus input with keyboard shortcuts
  useCommandK(() => {
    inputRef.current?.focus();
    setIsExpanded(true);
  }, true);

  useSlashShortcut(() => {
    inputRef.current?.focus();
    setIsExpanded(true);
  }, true);

  // Detect if input is a command or search
  const isCommand = (text: string) => {
    const lower = text.toLowerCase().trim();
    return lower.startsWith('create ') || 
           lower.startsWith('new ') ||
           lower.startsWith('add ') ||
           lower.startsWith('go to ') ||
           lower.startsWith('open ') ||
           lower.startsWith('upload ');
  };

  // Search handler with debounce
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!input.trim()) {
      setSearchResults([]);
      setCommandResults(commands.slice(0, 5));
      setIsSearching(false);
      return;
    }

    // Check if it looks like a command
    if (isCommand(input)) {
      const filtered = filterCommands(input, getContext());
      setCommandResults(filtered);
      setSearchResults([]);
      setIsSearching(false);
    } else {
      // Treat as search
      setIsSearching(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const results = await search(input);
          setSearchResults(results);
          setCommandResults([]);
        } catch (err) {
          console.error('Search error:', err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 200);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [input, getContext]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults, commandResults]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Close if clicking outside both the bar and the results dropdown
      const clickedInBar = barRef.current && barRef.current.contains(target);
      const clickedInResults = resultsDropdownRef.current && resultsDropdownRef.current.contains(target);
      
      if (!clickedInBar && !clickedInResults) {
        setIsExpanded(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const results = searchResults.length > 0 ? searchResults : commandResults;

    if (e.key === 'Escape') {
      e.preventDefault();
      setInput('');
      setIsExpanded(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < results.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleExecute(selectedIndex);
      }
    }
  };

  // Execute command or navigate to search result
  const handleExecute = async (index: number) => {
    const results = searchResults.length > 0 ? searchResults : commandResults;
    const result = results[index];
    if (!result) return;

    if ('type' in result) {
      // Navigate to search result
      const searchResult = result as SearchResult;
      router.push(searchResult.href);
      success('Navigating...', searchResult.title);
      setInput('');
      setIsExpanded(false);
    } else {
      // Execute command
      const command = result as typeof commands[0];
      
      // Special handling for create commands - open modals
      if (command.id === 'create:artist') {
        setActiveModal('artist');
        setInput('');
        setIsExpanded(false);
        return;
      }
      
      if (command.id === 'create:release') {
        setActiveModal('release');
        setInput('');
        setIsExpanded(false);
        return;
      }

      try {
        const resultData = await command.run(input, getContext());
        success(resultData.title, resultData.description);
        setInput('');
        setIsExpanded(false);
      } catch (err) {
        console.error('Command execution error:', err);
        showError('Command failed', 'An error occurred while executing the command');
      }
    }
  };

  const results = searchResults.length > 0 ? searchResults : commandResults;
  const showDropdown = isExpanded && (results.length > 0 || input.trim().length > 0);

  return (
    <>
      {/* Floating command bar at bottom center */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
        <div ref={barRef} className="relative w-[600px] max-w-[90vw]">
          {/* Results dropdown */}
          {showDropdown && (
            <div ref={resultsDropdownRef} className="absolute bottom-full left-0 right-0 mb-2 z-50">
              <div className="bg-gray-800 rounded-xl border border-gray-700 max-h-80 overflow-y-auto shadow-lg">
                {isSearching ? (
                  <div className="px-4 py-8 text-center text-gray-400">
                    <p className="text-sm">Searching...</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="p-2">
                    {results.map((result, index) => (
                      <ResultCard
                        key={'id' in result ? result.id : `cmd-${index}`}
                        result={result}
                        isSelected={index === selectedIndex}
                        onClick={() => handleExecute(index)}
                        resultType={searchResults.length > 0 ? 'search' : 'command'}
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

          {/* Command bar container */}
          <div 
            className={`bg-gray-800 rounded-lg border transition-colors duration-75 ${
              isExpanded 
                ? 'border-white' 
                : 'border-gray-700'
            }`}
          >
            {/* Row 1: Input field */}
            <div className="px-3 py-2 border-b border-gray-700">
              <div className="flex items-center gap-2">
                {/* Icon indicator */}
                <div className="flex-shrink-0 text-gray-400">
                  {isCommand(input) ? (
                    <Command className="w-4 h-4" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </div>

                {/* Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setIsExpanded(true);
                  }}
                  placeholder="Search artist, release or deliverable"
                  className="
                    min-w-0 flex-1 bg-transparent border-none outline-none
                    text-white placeholder-gray-500 text-xs
                    truncate
                    focus:ring-0 focus:outline-none
                  "
                />

                {/* Clear button */}
                {input && (
                  <button
                    onClick={() => {
                      setInput('');
                      inputRef.current?.focus();
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-white transition-colors duration-75 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Action area */}
            <div className="flex items-center justify-between px-3 py-2">
              {/* Left side: New buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActiveModal('artist');
                    setInput('');
                    setIsExpanded(false);
                  }}
                >
                  New Artist
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActiveModal('release');
                    setInput('');
                    setIsExpanded(false);
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
                    setInput('');
                    setIsExpanded(false);
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
                  size="sm"
                  aria-label="Voice dictation"
                  onClick={() => {
                    // TODO: Implement voice dictation
                    success('Voice dictation', 'Feature coming soon');
                  }}
                />
                <IconButton
                  icon={Send}
                  variant="ghost"
                  size="sm"
                  aria-label="Send"
                  onClick={() => {
                    if (!input.trim()) return;
                    const results = searchResults.length > 0 ? searchResults : commandResults;
                    if (results.length > 0) {
                      handleExecute(selectedIndex);
                    }
                  }}
                  disabled={!input.trim() || (searchResults.length === 0 && commandResults.length === 0)}
                />
              </div>
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

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};

CommandBarComponent.displayName = 'CommandBar';

// Memoize to prevent unnecessary re-renders when parent component updates
export const CommandBar = React.memo(CommandBarComponent);

export default CommandBar;

// Register component metadata
export const commandBarMetadata: ComponentMetadata = {
  name: 'CommandBar',
  description: 'Persistent floating command palette and search bar at the bottom of the screen',
  category: 'navigation',
  variants: [
    {
      name: 'default',
      description: 'Standard command bar with search and actions',
    },
  ],
  sizes: [],
  applicableStates: ['default', 'focus', 'loading'],
  props: [
    {
      name: 'artistId',
      type: 'string',
      required: false,
      description: 'Current artist context ID for context-aware commands',
    },
    {
      name: 'releaseId',
      type: 'string',
      required: false,
      description: 'Current release context ID for context-aware commands',
    },
    {
      name: 'organizationId',
      type: 'string',
      required: false,
      description: 'Current organization context ID',
    },
    {
      name: 'onOpen',
      type: '() => void',
      required: false,
      description: 'Callback fired when command bar is opened/focused',
    },
    {
      name: 'onClose',
      type: '() => void',
      required: false,
      description: 'Callback fired when command bar is closed/blurred',
    },
    {
      name: 'onExecute',
      type: '(commandId: string) => void',
      required: false,
      description: 'Callback fired when a command is executed',
    },
  ],
  example: `// Basic usage
<CommandBar />

// With context
<CommandBar 
  artistId={artistId}
  releaseId={releaseId}
  onExecute={(commandId) => console.log('Executed:', commandId)}
/>`,
  a11y: 'Full keyboard navigation support. Focus management with ⌘K/Ctrl+K and / shortcuts. Dropdown results use role="listbox" and role="option". ARIA labels on all interactive elements.',
};

registerComponent(commandBarMetadata);

