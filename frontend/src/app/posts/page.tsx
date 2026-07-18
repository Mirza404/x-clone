'use client';
import { useState } from 'react';
import { fetchPosts } from '../utils/fetchInfo';
import { useQuery } from '@tanstack/react-query';
import NewPostPage from '../newPost/page';
import PostListInfinite from '../components/posts/PostListInfinite';
import CustomToaster from '../components/ui/CustomToaster';
import LoadCircle from '../components/ui/LoadCircle';
import FeedTabs from '../components/feed/FeedTabs';
import EmptyState from '../components/ui/EmptyState';

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>(
    'for-you'
  );
  const postsQuery = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetchPosts(),
  });

  if (postsQuery.isLoading) return <LoadCircle />;
  if (postsQuery.isError) return <pre>Error</pre>;

  return (
    <div className="flex justify-center flex-col m-0 w-full">
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      {/* Only show on desktop */}
      <NewPostPage />
      {activeTab === 'for-you' ? (
        <PostListInfinite />
      ) : (
        <EmptyState
          title="You're not following anyone yet"
          subtitle="Posts from accounts you follow will appear here."
        />
      )}
      <CustomToaster />
    </div>
  );
}
