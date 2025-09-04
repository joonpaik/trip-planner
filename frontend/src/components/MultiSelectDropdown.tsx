import { format } from 'path';
import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  options: Map<string, string>;
  selectedOptions: string[];
  menuType: string;
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedOptions,
  menuType,
  onSelectionChange,
  placeholder = 'Select options...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    console.log('Option selected:', option);
    if (selectedOptions.includes(option)) {
      onSelectionChange(selectedOptions.filter((item) => item !== option));
    } else {
      onSelectionChange([...selectedOptions, option]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (selectedOptions.length === 0) return placeholder;
    if (selectedOptions.length === 1)
      return options.get(selectedOptions[0]) || '';
    return `${selectedOptions.length} items selected`;
  };

  return (
    <div className={`relative inline-block text-left w-full`} ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-full rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-all duration-200"
      >
        <span
          className={`truncate ${selectedOptions.length > 0 ? 'text-gray-900' : 'text-gray-500'}`}
        >
          {getDisplayText()}
        </span>

        <div className="flex items-center ml-3">
          {selectedOptions.length > 0 ? (
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-all duration-200"
              title="Clear selection"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : (
            <svg
              className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1 max-h-60 overflow-y-auto">
            {Array.from(options.entries()).map(([key, value], index) => (
              <button
                key={key} // Use key instead of index for better React performance
                onClick={() => handleSelect(key)} // Assuming you want to select by key
                className={`flex items-center justify-between w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                  selectedOptions.includes(key)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{value}</span> {/* Display the key */}
                {selectedOptions.includes(key) && (
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
