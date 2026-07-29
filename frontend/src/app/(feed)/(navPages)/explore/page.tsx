'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import type { Post } from '@/app/types/Post';
import PostItem from '@/app/components/posts/PostItem';
import LoadCircle from '@/app/components/ui/LoadCircle';
import PostSkeleton from '@/app/components/ui/PostSkeleton';
import EmptyState from '@/app/components/ui/EmptyState';
import { usePostMutations } from '@/app/utils/postMutations';

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreResults />
    </Suspense>
  );
}

function ExploreResults() {
  const query = (useSearchParams().get('q') ?? '').trim();
  const { ref, inView } = useInView();
  const { useFetchInfiniteSearchResults, useDeletePost } = usePostMutations();
  const deletePostMutation = useDeletePost();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useFetchInfiniteSearchResults(query);

  const posts: Post[] =
    data?.pages?.flatMap((group) => group?.posts ?? []) ?? [];

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  if (!query) {
    return (
      <EmptyState
        title="Search X Clone"
        subtitle="Find posts by content or author name."
      />
    );
  }

  return (
    <div className="w-full">
      <h1 className="border-b border-border p-4 text-xl font-bold text-content">
        Results for &ldquo;{query}&rdquo;
      </h1>

      {status === 'pending' ? (
        Array.from({ length: 5 }).map((_, i) => <PostSkeleton key={i} />)
      ) : status === 'error' ? (
        <div className="flex flex-col items-center gap-3 border-b border-border py-10 text-center">
          <p className="text-[15px] text-muted">Something went wrong.</p>
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          title="No results"
          subtitle="Try a different search term."
        />
      ) : (
        <>
          {posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              onDelete={() => deletePostMutation.mutate(post.id)}
            />
          ))}
          <div
            ref={ref}
            className="flex justify-center border-b border-border py-6"
          >
            {isFetchingNextPage ? (
              <LoadCircle />
            ) : hasNextPage ? null : (
              <span className="text-muted">Nothing more to load.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
