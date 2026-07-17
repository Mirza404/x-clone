'use client';

import type React from 'react';
import { useState, useEffect } from 'react';

interface CustomLoadBarProps {
  progress: number;
}

const CustomLoadBar: React.FC<CustomLoadBarProps> = ({ progress }) => {
  const [animatedProgress, setAnimatedProgress] = useState<number | null>(null);

  useEffect(() => {
    if (progress !== 100) return;

    const interval = setInterval(() => {
      setAnimatedProgress((prev) => {
        const next = prev ?? 0;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => setAnimatedProgress(null), 500);
          return 100;
        }
        return Math.min(100, next + 5);
      });
    }, 16);
    return () => clearInterval(interval);
  }, [progress]);

  const displayProgress = animatedProgress ?? progress;

  if (displayProgress === 0) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 w-full h-1 bg-gray-200">
      <div
        className="h-full bg-blue-500 transition-all duration-300 ease-out"
        style={{ width: `${displayProgress}%` }}
      />
    </div>
  );
};

export default CustomLoadBar;
