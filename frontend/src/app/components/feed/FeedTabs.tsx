'use client';

import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Tab from '../ui/Tab';

const TOPIC_TABS = ['Tech', 'Business', 'Crypto'];

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
      {TOPIC_TABS.map((topic) => (
        <Tab
          key={topic}
          label={topic}
          isActive={false}
          onClick={() => toast('Coming soon')}
        />
      ))}
      <button
        type="button"
        onClick={() => toast('Coming soon')}
        aria-label="Add topic"
        className="flex flex-shrink-0 items-center justify-center px-4 text-muted transition-colors hover:bg-hover"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}
