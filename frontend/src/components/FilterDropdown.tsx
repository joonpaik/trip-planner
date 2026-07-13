import React, { useState, useEffect, useRef } from 'react';
import { UserTaskCard } from '../pages/Home';

// Define the task object type
interface Task {
  taskName: string;
  dueDate: string;
}

// Define component props
interface FilterDropdownProps {
  options: string[];
  placeholder?: string;
  menuType: string;
  onSelectionChange?: (task: string | null) => void;
  onStateChange?: (state: 'asc' | 'desc') => void;
}
// There are 4 filters to cover: by title, due date, status, and people assigned
// The purpose of each filter to narrow down the tasks displayed in the task list
// returns the selected filter to the parent component
// Task dropdown component
export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  options,
  placeholder = 'Select a task',
  menuType,
  onSelectionChange,
  onStateChange,
}) => {
  const MENU_TYPE = {
    TITLE: 'title',
    DUEDATE: 'dueDate',
    STATUS: 'status',
    PEOPLE: 'people',
  } as const;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentState, setCurrentState] = useState<'asc' | 'desc'>('asc');
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    setSelectedOption(option);
    setIsOpen(false);
    onSelectionChange?.(option);
  };

  const handleStateToggle = () => {
    const newState = currentState === 'asc' ? 'desc' : 'asc';
    setCurrentState(newState);
    onStateChange?.(newState);
  };

  const clearSelection = (e: React.MouseEvent) => {
    setSelectedOption(null);
    e.stopPropagation();
    onSelectionChange?.(null);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatOption = (option: string | null): string => {
    if (option === null) return '';
    if (menuType === MENU_TYPE.DUEDATE) {
      return formatDate(option);
    } else if (menuType === MENU_TYPE.STATUS) {
      if (option === '-1') return 'Past Due';
      if (option === '0') return 'Not Started';
      if (option === '1') return 'In Progress';
      if (option === '2') return 'Completed';
      return option;
    }
    return option;
  };

  // Check if task is overdue
  const isOverdue = (deadline: Date): boolean => {
    return new Date(deadline) < new Date();
  };

  return (
    <div className={`relative inline-block text-left w-full`} ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between w-full rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition-all duration-200"
      >
        <span
          className={`truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}
        >
          {formatOption(selectedOption) || placeholder}
        </span>

        <div className="flex items-center ml-3">
          {selectedOption ? (
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
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelect(option)}
                className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                  selectedOption === option
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {formatOption(option)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
