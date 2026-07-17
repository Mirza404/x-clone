'use client';

import { useState } from 'react';

export default function MobileTabs() {
  const [activeTab, setActiveTab] = useState('for-you');

  return (
    <div className="flex w-full border-b border-x-border md:hidden">
      <button
        className={`relative flex-1 py-4 text-center font-medium ${
          activeTab === 'for-you' ? 'text-x-text' : 'text-x-text-secondary'
        }`}
        onClick={() => setActiveTab('for-you')}
      >
        For you
        {activeTab === 'for-you' && (
          <div className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 transform rounded-full bg-x-blue"></div>
        )}
      </button>
      <button
        className={`relative flex-1 py-4 text-center font-medium ${
          activeTab === 'following' ? 'text-x-text' : 'text-x-text-secondary'
        }`}
        onClick={() => setActiveTab('following')}
      >
        Following
        {activeTab === 'following' && (
          <div className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 transform rounded-full bg-x-blue"></div>
        )}
      </button>
    </div>
  );
}
