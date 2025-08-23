import React, { useState, useEffect } from 'react';
import '../index.css';

interface CardProps {
  title: string;
  description: string;
  icon?: string;
  bgColor?: string;
}
const Card: React.FC<CardProps> = ({ title, description, icon, bgColor }) => {
  return (
    <div
      className={`${bgColor} rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 cursor-pointer`}
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>

      {/* Description */}
      <p className="text-gray-600 mb-4">{description}</p>
    </div>
  );
};

export default Card;
