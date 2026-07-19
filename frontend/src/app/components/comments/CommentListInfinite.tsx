'use client';

import { useInView } from 'react-intersection-observer';
import { usePostMutations } from '@/app/utils/postMutations';
import { useParams } from 'next/navigation';
import { useEffect, Fragment } from 'react';
import LoadCircle from '../ui/LoadCircle';
import type { Comment } from '../../types/Comment';
import CommentItem from './CommentItem';
import { useRouter } from 'next/navigation';
import { useCommentMutations } from '../../utils/commentMutations';

export const CommentListInfinite = () => {
  const params = useParams();
  const postId = params.id as string;
  const { useFetchInfiniteComments } = usePostMutations();
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
    return (
      <div className="p-4 text-center text-muted">Something went wrong.</div>
    );
  }

  return (
    <div>
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
        ) : hasNextPage ? null : data?.pages[0]?.comments?.length ? (
          <div className="p-4 text-center text-muted">
            Nothing more to load.
          </div>
        ) : (
          <div className="p-4 text-center text-muted">No comments yet.</div>
        )}
      </div>
    </div>
  );
};

export default CommentListInfinite;
