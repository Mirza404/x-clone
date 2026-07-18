'use client';

import { useState } from 'react';
import Tab from '../ui/Tab';

export default function MobileTabs() {
  const [activeTab, setActiveTab] = useState('for-you');

  return (
    <div className="flex w-full border-b border-border md:hidden">
      <Tab
        label="For you"
        isActive={activeTab === 'for-you'}
        onClick={() => setActiveTab('for-you')}
      />
      <Tab
        label="Following"
        isActive={activeTab === 'following'}
        onClick={() => setActiveTab('following')}
      />
    </div>
  );
}
