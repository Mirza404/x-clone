'use client';

import Tab from '../ui/Tab';

interface FeedTabsProps {
  activeTab: 'for-you' | 'following';
  onTabChange: (tab: 'for-you' | 'following') => void;
}

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div
      role="tablist"
      className="sticky top-0 z-20 flex border-b border-border bg-bg/85 backdrop-blur"
    >
      <Tab
        label="For you"
        isActive={activeTab === 'for-you'}
        onClick={() => onTabChange('for-you')}
      />
      <Tab
        label="Following"
        isActive={activeTab === 'following'}
        onClick={() => onTabChange('following')}
      />
    </div>
  );
}
