'use client';

import { Fragment, useEffect } from 'react';
import type { Post } from '../../types/Post';
import { useInView } from 'react-intersection-observer';
import PostItem from './PostItem';
import {
  useFetchPosts,
  useFetchInfinitePosts,
  useDeletePost,
} from '../../utils/mutations';
import LoadCircle from '../ui/LoadCircle';

function PostListInfinite() {
  const { ref, inView } = useInView();
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
    return <div>Error: "Error happened"</div>;
  }  

  return (
    <div className="w-full ">
      {data?.pages?.map((group, i) => (
        <Fragment key={i}>
          {group?.posts?.posts?.map((post: Post) => (
            <div key={post.id} className="relative">
              <PostItem
                post={post}
                onDelete={() => deletePostMutation.mutate(post.id)}
              />
            </div>
          ))}
        </Fragment>
      ))}
      <div ref={ref} className="py-4 flex justify-center border-l border-r border-b border-gray-700">
        {isFetchingNextPage ? (
          <LoadCircle />
        ) : hasNextPage ? (
          <span className="text-gray-500">Load More</span>
        ) : (
          <span className="text-gray-500">Nothing more to load.</span>
        )}
      </div>
    </div>
  );
}

export default PostListInfinite;
