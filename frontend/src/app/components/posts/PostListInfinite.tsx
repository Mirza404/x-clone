'use client';

import { Fragment, useEffect } from 'react';
import type { Post } from '../../types/Post';
import { useInView } from 'react-intersection-observer';
import PostItem from './PostItem';
import { usePostMutations } from '@/app/utils/postMutations';
import LoadCircle from '../ui/LoadCircle';
import PostSkeleton from '../ui/PostSkeleton';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';

function PostListInfinite() {
  const { ref, inView } = useInView();
  const { useFetchPosts, useFetchInfinitePosts, useDeletePost } =
    usePostMutations();
  const postsQuery = useFetchPosts();
  const deletePostMutation = useDeletePost();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useFetchInfinitePosts();

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  if (postsQuery.isLoading || status === 'pending') {
    return (
      <div className="w-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (postsQuery.isError || status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 border-b border-border py-10 text-center">
        <p className="text-[15px] text-muted">Something went wrong.</p>
        <Button variant="secondary-outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const totalPosts = data?.pages?.reduce(
    (sum, group) => sum + (group?.posts?.length ?? 0),
    0
  );

  if (totalPosts === 0) {
    return (
      <EmptyState
        title="Welcome to X Clone"
        subtitle="When posts arrive, they'll show up here."
      />
    );
  }

  return (
    <div className="w-full">
      {data?.pages?.map((group, i) => (
        <Fragment key={i}>
          {group?.posts?.map((post: Post) => (
            <div key={post.id} className="relative">
              <PostItem
                post={post}
                onDelete={() => deletePostMutation.mutate(post.id)}
              />
            </div>
          ))}
        </Fragment>
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
    </div>
  );
}

export default PostListInfinite;
