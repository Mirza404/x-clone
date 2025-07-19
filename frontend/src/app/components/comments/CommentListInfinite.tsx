'use client';

import { useInView } from 'react-intersection-observer';
import { useFetchInfiniteComments } from '@/app/utils/mutations';
import { useParams } from 'next/navigation';
import { useEffect, Fragment } from 'react';
import LoadCircle from '../ui/LoadCircle';
import type { Comment } from '../../types/Comment';
import CommentItem from './CommentItem';
import { useRouter } from 'next/navigation';
import { useCommentMutations } from './mutations';

export const CommentListInfinite = () => {
  const params = useParams();
  const postId = params.id as string;
  const { ref, inView } = useInView();
  const router = useRouter();
  const { deleteCommentMutation } = useCommentMutations();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
    isError,
  } = useFetchInfiniteComments(postId);

  useEffect(() => {
    if (inView) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView]);

  if (isLoading || status === 'pending') {
    return <LoadCircle />;
  }

  if (isError) {
    return <div>Error: "Error happened"</div>;
  }

  return (
    <div className="border-l border-r border-b border-gray-700 mt-0">
      {data?.pages?.map((group, i) => (
        <Fragment key={i}>
          {group?.comments?.map((comment: Comment) => (
            <div key={comment.id} className="relative">
              <CommentItem
                comment={comment}
                onDelete={() => deleteCommentMutation.mutate(comment.id)}
                onEdit={() =>
                  router.push(`/posts/${postId}/comment/${comment.id}/edit`)
                }
              />
            </div>
          ))}
        </Fragment>
      ))}
      <div ref={ref}>
        {isFetchingNextPage ? (
          <LoadCircle />
        ) : hasNextPage ? (
          <div className="text-center p-4 text-gray-500">Load More</div>
        ) : data?.pages[0]?.comments?.length ? (
          <div className=" text-center p-4 text-gray-500">
            Nothing more to load.
          </div>
        ) : (
          <div className="text-center p-4 text-gray-500 border-t border-gray-700">
            No comments yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentListInfinite;
