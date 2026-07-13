import React, { useState, useEffect } from 'react';
import { DateDisplay } from './DateFormatter';
import { CheckCircle2, Trash2 } from 'lucide-react';
import '../index.css';

interface CardProps {
  taskTitle?: string;
  tripTitle?: string;
  description?: string;
  status?: number;
  deadline?: Date;
  bgColor?: string;
  onCardClick?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
}
const Card: React.FC<CardProps> = ({
  taskTitle,
  tripTitle,
  description,
  status,
  deadline,
  bgColor,
  onCardClick,
  onComplete,
  onDelete,
}) => {
  if (status === 0) {
    bgColor = 'bg-red-200';
  } else if (status === 1) {
    bgColor = 'bg-yellow-200';
  } else if (status === 2) {
    bgColor = 'bg-green-200';
  }
  return (
    <div
      onClick={onCardClick}
      className={`${bgColor} rounded-xl m-1 shadow-lg p-6 transition-all duration-300
        hover:shadow-2xl hover:-translate-y-2 cursor-pointer
        `}
    >
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-xl font-bold text-gray-800 mb-2 min-w-0 flex-1 break-words line-clamp-2">
          {taskTitle}
        </h3>
        <div className="flex-shrink-0 whitespace-nowrap text-sm font-medium text-gray-500">
          Due: <DateDisplay date={deadline ? new Date(deadline) : new Date()} />
        </div>
      </div>
      <div>
        <h4 className="text-md font-semibold text-gray-600 mb-2 truncate">
          {tripTitle}
        </h4>
      </div>
      <div>
        <p className="text-gray-600 mb-4 line-clamp-2 break-words">
          {description}
        </p>
      </div>
      {(onComplete || onDelete) && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10">
          {onComplete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              disabled={status === 2}
              title={status === 2 ? 'Already complete' : 'Mark as complete'}
              className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete task"
              className="flex items-center gap-1 text-sm font-medium text-red-700 hover:text-red-900"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Card;
