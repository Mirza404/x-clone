'use client';
import { useState } from 'react';
import NewPostPage from '../newPost/page';
import PostListInfinite from '@/app/components/posts/PostListInfinite';
import FeedTabs from '@/app/components/feed/FeedTabs';

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>(
    'for-you'
  );

  return (
    <div className="flex justify-center flex-col m-0 w-full">
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {/* Only show on desktop */}
      <NewPostPage />
      <PostListInfinite feed={activeTab} />
    </div>
  );
}
