'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import CommentItem from '@/app/components/comments/CommentItem';
import ReplyItem from '@/app/components/comments/ReplyItem';
import { useCommentMutations } from '@/app/components/comments/mutations';
import { getCommentById } from '@/app/utils/fetchInfo';
import CustomToaster from '@/app/components/ui/CustomToaster';
import LoadCircle from '@/app/components/ui/LoadCircle';

const CommentThreadPage = () => {
  const commentId = useParams().commentId as string;
  const postId = useParams().id as string;
  const { deleteCommentMutation } = useCommentMutations();

  const {
    data: commentData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['comment-thread', postId, commentId],
    queryFn: async () => {
      const res = await getCommentById(postId, commentId);
      return res;
    },
    enabled: !!postId && !!commentId,
  });

  const comment = commentData?.[0];

  const handleDeleteComment = (commentId: string) => {
    deleteCommentMutation.mutate(commentId);
  };

  if (isLoading)
    return (
      <div>
        <LoadCircle />
      </div>
    );

  if (isError || !comment || typeof comment.content !== 'string') {
    return <div>Something went wrong loading the comment.</div>;
  }

  return (
    <div className="border border-gray-600">
      <div className="max-w-2xl mx-auto mt-6 space-y-4">
        {/* Main Comment */}
        <CommentItem
          comment={comment}
          onDelete={() => handleDeleteComment(commentId)}
          onEdit={() => {
            window.location.href = `/posts/${postId}/comment/${commentId}/edit`;
          }}
        />

        {/* Replies */}
        {Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <>
            <h2 className="text-xl font-bold px-4 pt-4 border-t border-gray-600">
              Replies
            </h2>
            <div className=" space-y-2">
              {comment.replies.map((reply: any) => (
                <div className="border-t border-gray-600">
                  <ReplyItem
                    key={reply.id}
                    reply={reply}
                    onDelete={() => handleDeleteComment(reply.id)}
                    onEdit={() => {
                      window.location.href = `/posts/${postId}/comment/${reply.id}/edit`;
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <CustomToaster />
    </div>
  );
};

export default CommentThreadPage;
