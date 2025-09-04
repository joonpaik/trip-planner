import React, { useState, useEffect } from 'react';
import { DateDisplay } from './DateFormatter';
import '../index.css';

interface CardProps {
  taskTitle?: string;
  tripTitle?: string;
  description?: string;
  status?: number;
  deadline?: Date;
  bgColor?: string;
}
const Card: React.FC<CardProps> = ({
  taskTitle,
  tripTitle,
  description,
  status,
  deadline,
  bgColor,
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
      className={`${bgColor} rounded-xl m-1 shadow-lg p-6 transition-all duration-300 
        hover:shadow-2xl hover:-translate-y-2 cursor-pointer 
        `}
    >
      <div className="flex justify-between">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{taskTitle}</h3>
        <div className="min-w-10 text-sm font-medium text-gray-500">
          Due: <DateDisplay date={deadline ? new Date(deadline) : new Date()} />
        </div>
      </div>
      <div>
        <h4 className="text-md font-semibold text-gray-600 mb-2">
          {tripTitle}
        </h4>
      </div>
      <div className="truncate">
        <p className="text-gray-600 mb-4">{description} ewfrwefwefwefwefewfw</p>
      </div>
      {/* <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{taskTitle}</h3>
      <p className="text-gray-600 mb-4">{description}</p> */}
    </div>
  );
};

export default Card;
