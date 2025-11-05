import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  className?: string;
}

export default function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options...",
  maxSelections,
  className = ''
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOptions = options.filter(option => selectedValues.includes(option.id));

  const handleToggleOption = (optionId: string) => {
    const isSelected = selectedValues.includes(optionId);
    let newValues: string[];

    if (isSelected) {
      newValues = selectedValues.filter(id => id !== optionId);
    } else {
      if (maxSelections && selectedValues.length >= maxSelections) {
        return; // Don't add if max selections reached
      }
      newValues = [...selectedValues, optionId];
    }

    onChange(newValues);
  };

  const removeSelection = (optionId: string) => {
    onChange(selectedValues.filter(id => id !== optionId));
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected items display */}
                    <div className="min-h-[42px] bg-gray-500 border border-gray-600 rounded-md p-2 flex flex-wrap gap-1">
        {selectedOptions.length > 0 ? (
          <>
            {selectedOptions.map((option) => (
              <span
                key={option.id}
                className="inline-flex items-center gap-1 bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >
                {option.label}
                <button
                  type="button"
                  onClick={() => removeSelection(option.id)}
                  className="hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1 text-gray-300 hover:text-white text-sm"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-400 hover:text-white text-sm w-full text-left"
          >
            {placeholder}
            <ChevronDown className={`w-4 h-4 inline ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
          {/* Search input */}
          <div className="p-2 border-b border-gray-600">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full px-2 py-1 bg-gray-500 border border-gray-600 rounded text-white text-sm"
              autoFocus
            />
          </div>

          {/* Options */}
          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-400 text-sm">No options found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.id);
                const isDisabled = !isSelected && maxSelections && selectedValues.length >= maxSelections;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggleOption(option.id)}
                    disabled={!!isDisabled}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : isDisabled
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-white hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
} 