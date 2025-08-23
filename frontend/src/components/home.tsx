import React, { useState, useEffect } from 'react';
import '../index.css';
import Card from './Card';
import AnimationWrapper from './AnimationWrapper';

const Home: React.FC = () => {
  const sampleCardData = [
    {
      title: 'Card 1',
      description: 'This is the description for Card 1',
      icon: '📦',
      bgColor: 'bg-white',
    },
    {
      title: 'Card 2',
      description: 'This is the description for Card 2',
      icon: '🔒',
      bgColor: 'bg-gray-100',
    },
    {
      title: 'Card 3',
      description: 'This is the description for Card 3',
      icon: '⚙️',
      bgColor: 'bg-white',
    },
    {
      title: 'Card 4',
      description: 'This is the description for Card 4',
      icon: '🔧',
      bgColor: 'bg-white',
    },
  ];
  return (
    <div className="min-h-screen">
      <h1 className="font-bold text-center">Home Page</h1>
      <div className="grid place-items-center">
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4 p-4 w-1/2 border-4 border-black">
          {sampleCardData
            .filter((item, index) => index < 3)
            .map((card, index) => (
              <AnimationWrapper key={index} delay={index * 150}>
                <Card
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                  bgColor={card.bgColor}
                />
              </AnimationWrapper>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
