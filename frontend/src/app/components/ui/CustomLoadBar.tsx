import React, { useState, useEffect } from "react";

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
            setCurrentProgress(0);
            return 0;
          }
          return prev + 5;
        });
      }, 1);
    } else {
      setCurrentProgress(progress);
    }
  }, [progress]);

  if (currentProgress === 0) {
    return null;
  }

  return (
    <div className="absolute top-[0.05rem] w-full h-[0.15rem] bg-gray-200 rounded-none">
      <div
        className="relative top-0 left-0 h-[0.15rem] bg-blue-500 rounded-none"
        style={{ width: `${currentProgress}%` }}
      ></div>
    </div>
  );
};

export default CustomLoadBar;
