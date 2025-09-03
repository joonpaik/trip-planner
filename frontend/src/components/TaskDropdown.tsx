import React, { useState } from 'react';
import { UserTaskCard } from '../pages/Home';

// Define the task object type
interface Task {
  taskName: string;
  dueDate: string;
}

// Define component props
interface TaskDropdownProps {
  tasks: UserTaskCard[];
  placeholder?: string;
  menuType: string;
  onSelectionChange?: (task: string | null) => void;
  onStateChange?: (state: 'asc' | 'desc') => void;
}
// There are 4 filters to cover: by title, due date, status, and people assigned
// The purpose of each filter to narrow down the tasks displayed in the task list
// returns the selected filter to the parent component
// Task dropdown component
export const TaskDropdown: React.FC<TaskDropdownProps> = ({
  tasks,
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
  const [selectedTask, setSelectedTask] = useState<UserTaskCard | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [currentState, setCurrentState] = useState<'asc' | 'desc'>('asc');

  const handleSelect = (task: UserTaskCard) => {
    setSelectedTask(task);
    setIsOpen(false);
    // if (menuType === MENU_TYPE.TITLE) {
    //   onSelectionChange?.(task.title);
    // } else if (menuType === MENU_TYPE.DUEDATE) {
    //   onSelectionChange?.(task.dueDate);
    // } else if (menuType === MENU_TYPE.STATUS) {
    //   onSelectionChange?.(task.status.toString());
    // } else if (menuType === MENU_TYPE.PEOPLE) {
    //   // finsh this part later
    //   onSelectionChange?.(task.description);
    // }
  };

  const handleStateToggle = () => {
    const newState = currentState === 'asc' ? 'desc' : 'asc';
    setCurrentState(newState);
    onStateChange?.(newState);
  };

  const clearSelection = () => {
    setSelectedTask(null);
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

  // Check if task is overdue
  const isOverdue = (deadline: Date): boolean => {
    return new Date(deadline) < new Date();
  };

  return (
    <div className="relative inline-block w-80 flex">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-l-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex justify-between items-center"
      >
        <div className="flex-1 min-w-0">
          {selectedTask ? (
            <div>
              <div className="font-medium text-gray-900 truncate">
                {/* {selectedTask.title} */}
              </div>
              <div
                className={`text-sm truncate ${
                  isOverdue(selectedTask.deadline)
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}
              >
                Due: {selectedTask.deadline.toDateString()}
              </div>
            </div>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {selectedTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              title="Clear selection"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>
      {/* Single Toggle State Button */}
      {/* <button
        onClick={handleStateToggle}
        className={`px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-r-md ${
          currentState === 'asc'
            ? 'bg-green-500 text-white hover:bg-green-600'
            : currentState === 'desc'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        }`}
        title={`Toggle State (Currently: ${currentState || 'None'})`}
      >
        {currentState === 'asc' ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        ) : currentState === 'desc' ? (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7 7"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l4-4 4 4m0 6l-4 4-4-4"
            />
          </svg>
        )}
      </button> */}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="py-4 px-4 text-gray-500 text-sm text-center">
              No tasks available
            </div>
          ) : (
            <div className="py-1">
              {tasks.map((task, index) => (
                <button
                  key={`${task.tripTitle}-${index}`}
                  onClick={() => handleSelect(task)}
                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 focus:outline-none focus:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                    selectedTask?.tripTitle === task.tripTitle &&
                    selectedTask?.deadline === task.deadline
                      ? 'bg-blue-100'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {task.tripTitle}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
