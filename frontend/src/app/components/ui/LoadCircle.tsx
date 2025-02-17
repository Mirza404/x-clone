import React from "react";

const LoadCircle = ({ "data-testid": testId }: { "data-testid"?: string }) => {
  return (
    <div
      className="flex justify-center p-4 min-w-[600px] min-h-[200px]"
      data-testid={testId} // ✅ Now it accepts a test ID!
    >
      <div className="w-10 h-10 border-4 border-t-blue-500 border-gray-300 rounded-full animate-spin"></div>
    </div>
  );
};

export default LoadCircle;
