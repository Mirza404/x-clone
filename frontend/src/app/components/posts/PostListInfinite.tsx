'use client';

import { Fragment, useEffect } from 'react';
import type { Post } from '../../types/Post';
import { useInView } from 'react-intersection-observer';
import PostItem from './PostItem';
import { usePostMutations } from '@/app/utils/postMutations';
import LoadCircle from '../ui/LoadCircle';

function PostListInfinite() {
  const { ref, inView } = useInView();
  const { useFetchPosts, useFetchInfinitePosts, useDeletePost } =
    usePostMutations();
  const postsQuery = useFetchPosts();
  const deletePostMutation = useDeletePost();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useFetchInfinitePosts();

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  if (postsQuery.isLoading || status === 'pending') {
    return <LoadCircle />;
  }

  if (postsQuery.isError || status === 'error') {
    return <div>Error happened</div>;
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
        className="flex justify-center border-b border-x-border py-6"
      >
        {isFetchingNextPage ? (
          <LoadCircle />
        ) : hasNextPage ? (
          <span className="text-x-text-secondary">Load More</span>
        ) : (
          <span className="text-x-text-secondary">Nothing more to load.</span>
        )}
      </div>
    </div>
  );
}

export default PostListInfinite;
