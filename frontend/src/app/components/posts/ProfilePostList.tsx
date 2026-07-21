'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import type { Post } from '../../types/Post';
import PostItem from './PostItem';
import LoadCircle from '../ui/LoadCircle';
import PostSkeleton from '../ui/PostSkeleton';
import EmptyState from '../ui/EmptyState';
import { useProfileMutations } from '@/app/utils/profileMutations';
import { usePostMutations } from '@/app/utils/postMutations';

export default function ProfilePostList({ authorId }: { authorId: string }) {
  const { ref, inView } = useInView();
  const { useFetchInfiniteAuthorPosts } = useProfileMutations();
  const { useDeletePost } = usePostMutations();
  const deletePostMutation = useDeletePost();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useFetchInfiniteAuthorPosts(authorId);

  const posts: Post[] = data?.pages?.flatMap((group) => group?.posts ?? []) ?? [];

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  if (status === 'pending') {
    return (
      <div className="w-full">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 border-b border-border py-10 text-center">
        <p className="text-[15px] text-muted">Something went wrong.</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        title="No posts yet"
        subtitle="When they post, it'll show up here."
      />
    );
  }

  return (
    <div className="w-full">
      {posts.map((post: Post) => (
        <PostItem
          key={post.id}
          post={post}
          onDelete={() => deletePostMutation.mutate(post.id)}
        />
      ))}
      <div ref={ref} className="flex justify-center border-b border-border py-6">
        {isFetchingNextPage ? (
          <LoadCircle />
        ) : hasNextPage ? null : (
          <span className="text-muted">Nothing more to load.</span>
        )}
      </div>
    </div>
  );
}
