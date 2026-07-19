import React from 'react';

const LoadCircle = () => {
  return (
    <div
      role="status"
      className="flex min-h-[200px] w-full items-center justify-center p-4"
    >
      <div className="h-8 w-8 rounded-full border-4 border-x-border border-t-x-blue animate-spin"></div>
    </div>
  );
};

export default LoadCircle;
