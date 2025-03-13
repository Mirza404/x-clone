'use client';

import type React from 'react';
import { useState, useEffect } from 'react';

interface CustomLoadBarProps {
  progress: number;
}

const CustomLoadBar: React.FC<CustomLoadBarProps> = ({ progress }) => {
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    if (progress === 100) {
      const interval = setInterval(() => {
        setCurrentProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setCurrentProgress(0), 500);
            return 100;
          }
          return Math.min(100, prev + 5);
        });
      }, 16);
      return () => clearInterval(interval);
    } else {
      setCurrentProgress(progress);
    }
  }, [progress]);

  if (currentProgress === 0) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
      <div
        className="h-full bg-blue-500 transition-all duration-300 ease-out"
        style={{ width: `${currentProgress}%` }}
      />
    </div>
  );
};

export default CustomLoadBar;
