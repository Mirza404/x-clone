'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import CommentItem from '@/app/components/comments/CommentItem';
import ReplyItem from '@/app/components/comments/ReplyItem';
import { useCommentMutations } from '@/app/utils/commentMutations';
import { getCommentById } from '@/app/utils/fetchInfo';
import CustomToaster from '@/app/components/ui/CustomToaster';
import LoadCircle from '@/app/components/ui/LoadCircle';
import NewReply from '@/app/components/comments/NewReply';
import { useSession } from 'next-auth/react';

const CommentThreadPage = () => {
  const commentId = useParams().commentId as string;
  const postId = useParams().id as string;
  const { deleteReplyMutation } = useCommentMutations();
  const { data: session } = useSession();
  const email = session?.user?.email || '';

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
    deleteReplyMutation.mutate(commentId);
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
      <div className="max-w-2xl mx-auto mt-0 space-y-4">
        <CommentItem
          comment={comment}
          onDelete={() => handleDeleteComment(commentId)}
          onEdit={() => {
            window.location.href = `/posts/${postId}/comment/${commentId}/edit`;
          }}
        />

        <h2 className="text-xl font-bold p-4 pt-0 pb-0">Replies</h2>
        <NewReply
          postId={postId}
          parentCommentId={commentId}
          content={comment.content}
          email={email}
        />
        {/* Replies */}
        {Array.isArray(comment.replies) && comment.replies.length > 0 && (
          <>
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
