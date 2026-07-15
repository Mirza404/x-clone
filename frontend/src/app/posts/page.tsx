'use client';
import { fetchPosts } from '../utils/fetchInfo';
import { useQuery } from '@tanstack/react-query';
import NewPostPage from '../newPost/page';
import PostListInfinite from '../components/posts/PostListInfinite';
import CustomToaster from '../components/ui/CustomToaster';
import LoadCircle from '../components/ui/LoadCircle';

export default function PostsPage() {
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
}
