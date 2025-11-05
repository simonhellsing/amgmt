import React from 'react';
import { ChevronRight, User, Disc, Package, Folder } from 'lucide-react';
import { SearchResult, ResultCardData } from '@/types/command-dock';
import { registerComponent, type ComponentMetadata } from '@/lib/componentMetadata';

export interface ResultCardProps {
  /** Search result or command result data */
  result: SearchResult | ResultCardData;
  
  /** Whether this result is currently selected */
  isSelected: boolean;
  
  /** Click handler */
  onClick: () => void;
  
  /** Type of result for styling */
  resultType?: 'search' | 'command';
}

const typeIcons = {
  artist: User,
  release: Disc,
  deliverable: Package,
  folder: Folder,
};

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  isSelected,
  onClick,
  resultType = 'search',
}) => {
  const isSearchResult = 'type' in result;
  const Icon = isSearchResult ? typeIcons[result.type] : null;

  return (
    <button
      role="option"
      aria-selected={isSelected}
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 text-left
        transition-colors rounded-md group cursor-pointer
        ${isSelected 
          ? 'bg-gray-700 text-white' 
          : 'text-gray-300 hover:bg-gray-750'
        }
      `}
    >
      {/* Icon */}
      {Icon && (
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center
          ${isSelected ? 'bg-gray-600' : 'bg-gray-800'}
        `}>
          <Icon className="w-4 h-4" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-xs text-gray-400 truncate">
          {result.title}
        </div>
        {'subtitle' in result && result.subtitle && (
          <div className="text-xs text-gray-400 truncate mt-0.5">
            {result.subtitle}
          </div>
        )}
        {'description' in result && result.description && (
          <div className="text-xs text-gray-400 truncate mt-0.5">
            {result.description}
          </div>
        )}
      </div>

      {/* Arrow affordance */}
      <ChevronRight 
        className={`
          flex-shrink-0 w-4 h-4 transition-all
          ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0'}
        `} 
      />
    </button>
  );
};

ResultCard.displayName = 'ResultCard';

// Register component metadata
export const resultCardMetadata: ComponentMetadata = {
  name: 'ResultCard',
  description: 'Display card for command bar search results and command items',
  category: 'data',
  variants: [
    {
      name: 'search',
      description: 'Search result with type icon (artist, release, deliverable, folder)',
    },
    {
      name: 'command',
      description: 'Command item without type icon',
    },
  ],
  sizes: [],
  applicableStates: ['default', 'hover', 'selected'],
  props: [
    {
      name: 'result',
      type: 'SearchResult | ResultCardData',
      required: true,
      description: 'The search result or command result to display',
    },
    {
      name: 'isSelected',
      type: 'boolean',
      required: true,
      description: 'Whether this result is currently keyboard-selected',
    },
    {
      name: 'onClick',
      type: '() => void',
      required: true,
      description: 'Handler called when result is clicked',
    },
    {
      name: 'resultType',
      type: "'search' | 'command'",
      default: "'search'",
      required: false,
      description: 'Type of result for appropriate styling and icon display',
    },
  ],
  example: `<ResultCard
  result={{
    id: '123',
    type: 'artist',
    title: 'Miles Davis',
    subtitle: 'Jazz • United States',
    href: '/artists/123'
  }}
  isSelected={false}
  onClick={() => navigate('/artists/123')}
  resultType="search"
/>`,
  a11y: 'Uses role="option" with aria-selected. Interactive button with keyboard support. Clear visual indicators for selected state.',
};

registerComponent(resultCardMetadata);

