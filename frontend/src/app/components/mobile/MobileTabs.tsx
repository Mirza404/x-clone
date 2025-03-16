'use client';

import { useState } from 'react';

export default function MobileTabs() {
  const [activeTab, setActiveTab] = useState('for-you');

  return (
    <div className="flex w-full border-b border-gray-800 md:hidden">
      <button
        className={`flex-1 py-4 text-center font-medium relative ${
          activeTab === 'for-you' ? 'text-white' : 'text-gray-500'
        }`}
        onClick={() => setActiveTab('for-you')}
      >
        For you
        {activeTab === 'for-you' && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#1d9bf0] rounded-full"></div>
        )}
      </button>
      <button
        className={`flex-1 py-4 text-center font-medium relative ${
          activeTab === 'following' ? 'text-white' : 'text-gray-500'
        }`}
        onClick={() => setActiveTab('following')}
      >
        Following
        {activeTab === 'following' && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-[#1d9bf0] rounded-full"></div>
        )}
      </button>
    </div>
  );
}
