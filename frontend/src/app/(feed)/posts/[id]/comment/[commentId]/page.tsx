'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import CommentItem from '@/app/components/comments/CommentItem';
import ReplyItem from '@/app/components/comments/ReplyItem';
import { useCommentMutations } from '@/app/utils/commentMutations';
import { getComment } from '@/app/utils/fetchInfo';
import LoadCircle from '@/app/components/ui/LoadCircle';
import NewReply from '@/app/components/comments/NewReply';
import EmptyState from '@/app/components/ui/EmptyState';
import AuthWall from '@/app/components/ui/AuthWall';
import type { Comment } from '@/app/types/Comment';

const CommentThreadPage = () => {
  const commentId = useParams().commentId as string;
  const postId = useParams().id as string;
  const router = useRouter();
  const { status } = useSession();
  const { deleteReplyMutation } = useCommentMutations();

  const {
    data: comment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['comment-thread', postId, commentId],
    queryFn: () => getComment(postId, commentId),
    enabled: !!postId && !!commentId,
  });

  const handleDeleteComment = (id: string) => {
    deleteReplyMutation.mutate(id);
  };

  const header = (
    <div className="sticky top-0 z-20 flex items-center gap-6 border-b border-border bg-bg/85 px-4 py-2 backdrop-blur">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-full text-content transition-colors hover:bg-hover"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-xl font-bold text-content">Thread</h1>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {header}
        <LoadCircle />
      </div>
    );
  }

  if (isError || !comment || typeof comment.content !== 'string') {
    return (
      <div className="min-h-screen">
        {header}
        <EmptyState
          title="Something went wrong"
          subtitle="We couldn't load this comment. It may have been deleted."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {header}

      <CommentItem
        comment={comment}
        onDelete={() => handleDeleteComment(commentId)}
        onEdit={() => router.push(`/posts/${postId}/comment/${commentId}/edit`)}
      />

      <h2 className="border-b border-border p-4 text-xl font-bold text-content">
        Replies
      </h2>

      {status === 'authenticated' ? (
        <NewReply
          postId={postId}
          parentCommentId={commentId}
          content={comment.content}
        />
      ) : (
        <AuthWall />
      )}

      {Array.isArray(comment.replies) && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply: Comment) => (
            <div key={reply.id} className="border-t border-border">
              <ReplyItem
                reply={reply}
                onDelete={() => handleDeleteComment(reply.id)}
                onEdit={() =>
                  router.push(`/posts/${postId}/comment/${reply.id}/edit`)
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThreadPage;
