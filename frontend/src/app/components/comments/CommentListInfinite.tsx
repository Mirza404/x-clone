'use client';

import { useInView } from 'react-intersection-observer';
import { useFetchInfiniteComments } from '@/app/utils/mutations';
import { useParams } from 'next/navigation';
import { useEffect, Fragment } from 'react';
import LoadCircle from '../ui/LoadCircle';
import type { Comment } from '../../types/Comment';
import CommentItem from './CommentItem';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

export const CommentListInfinite = () => {
  const params = useParams();
  const postId = params.id as string;
  const { ref, inView } = useInView();
  const queryClient = useQueryClient();
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
    isError,
  } = useFetchInfiniteComments(postId);

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await axios.patch(
        `${serverUrl}/api/post/${postId}/comment/delete/${commentId}`
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment deleted successfully');
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['infiniteComments', postId] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to delete the comment'
      );
    },
  });

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
          <div className="border-t border-gray-700 text-center p-4 text-gray-500">
            Nothing more to load.
          </div>
        ) : (
          <div className="text-center p-4 text-gray-500">No comments yet.</div>
        )}
      </div>
    </div>
  );
};

export default CommentListInfinite;
