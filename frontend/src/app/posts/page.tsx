'use client';
import type React from 'react';
import { fetchPosts } from '../utils/fetchInfo';
import type { Post } from '../types/Post';
import { useQuery } from '@tanstack/react-query';
import NewPostPage from '../newPost/page';
import PostListInfinite from '../components/posts/PostListInfinite';
import CustomToaster from '../components/ui/CustomToaster';
import LoadCircle from '../components/ui/LoadCircle';

export interface PostListProps {
  allPosts: Post[];
}

export const Page: React.FC<PostListProps> = () => {
  const postsQuery = useQuery({
    queryKey: ['posts'],
    queryFn: () => fetchPosts(),
  });

  if (postsQuery.isLoading) return <LoadCircle />;
  if (postsQuery.isError) return <pre>Error</pre>;

  return (
    <div className="flex justify-center flex-col m-0 w-full">
      {/* Only show on desktop */}
      <NewPostPage />
      <PostListInfinite />
      <CustomToaster />
    </div>
  );
};

export default Page;
