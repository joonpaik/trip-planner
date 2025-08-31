import React, { useState, useEffect } from 'react';
import '../index.css';

interface AnimationWrapperProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const AnimationWrapper = ({
  children,
  delay = 0,
  className = '',
}: AnimationWrapperProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`
      transform transition-all duration-700 ease-out
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
      ${className}
    `}
    >
      {children}
    </div>
  );
};

export default AnimationWrapper;
