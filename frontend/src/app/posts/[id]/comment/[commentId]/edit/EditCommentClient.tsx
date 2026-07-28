'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CustomLoadBar from '@/app/components/ui/CustomLoadBar';
import LoadCircle from '@/app/components/ui/LoadCircle';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';
import { getComment } from '@/app/utils/fetchInfo';
import { useQuery } from '@tanstack/react-query';
import { useEnterSubmit } from '@/app/utils/formSubmit';
import { getApiErrorMessage } from '@/app/utils/apiError';
import api from '@/app/utils/apiClient';
import Avatar from '@/app/components/ui/Avatar';
import Button from '@/app/components/ui/Button';
import EmptyState from '@/app/components/ui/EmptyState';

const EditCommentPage = () => {
  const params = useParams();
  const postId = params.id as string;
  const commentId = params.commentId as string;
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const {
    data: comment,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['comment-thread', postId, commentId],
    queryFn: () => getComment(postId, commentId),
    enabled: !!postId && !!commentId,
  });
  const [prevComment, setPrevComment] = useState(comment);

  if (comment !== prevComment) {
    setPrevComment(comment);
    if (comment?.content && !content) {
      setContent(comment.content);
    }
  }

  const editCommentMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      setLoading(true);
      setProgress(0);

      // Simulate progress for better UX
      setProgress(30);

      const response = await api.patch(
        `/api/post/${postId}/comment/edit/${commentId}`,
        { content }
      );

      setProgress(100);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment updated successfully');
      setProgress(100);
      setLoading(false);
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['infiniteComments', postId],
        });
        queryClient.invalidateQueries({
          queryKey: ['comment-thread', postId, commentId],
        });
        router.back();
      }, 1000);
    },
    onError: (error: unknown) => {
      setLoading(false);
      setProgress(0);
      toast.error(getApiErrorMessage(error, 'Failed to update the comment'));
    },
  });

  const handleSave = () => {
    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    editCommentMutation.mutate({ commentId, content });
  };

  const handleCancel = () => {
    router.back();
  };
  const handleEnterSubmit = useEnterSubmit({
    loading,
    content,
    onSubmit: handleSave,
  });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [content]);

  if (isLoading) {
    return (
      <>
        <LoadCircle />
      </>
    );
  }

  if (isError || !comment) {
    return (
      <EmptyState
        title="Something went wrong"
        subtitle="We couldn't load this comment. It may have been deleted."
      />
    );
  }

  return (
    <>
      <div className="flex justify-center">
        <CustomLoadBar progress={progress} />

        <div className="mx-auto mt-0 flex w-full flex-row border-b border-border px-4 pt-2">
          <div className="mr-2 pt-2">
            <Avatar
              src={session?.user?.image}
              alt={session?.user?.name ?? 'Profile'}
              size="md"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col py-3">
            <div className="mb-2">
              <span className="text-sm text-muted">Editing comment</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (loading || content.trim() === '') return;

                handleSave();
                setContent('');
              }}
            >
              <textarea
                ref={textareaRef}
                className="min-h-[28px] w-full resize-none border-none bg-transparent py-0.5 text-xl text-content placeholder-muted focus:outline-none"
                onKeyDown={handleEnterSubmit}
                maxLength={380}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
              />

              <div className="mt-4 flex items-center justify-between border-t border-border pt-2">
                <span
                  className={`text-sm ${content.length > 380 ? 'text-like' : 'text-muted'}`}
                >
                  {content.length}/380 characters
                </span>

                <div className="flex gap-2">
                  <Button
                    variant="secondary-outline"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="primary-black"
                    onClick={handleSave}
                    disabled={loading || !content.trim()}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditCommentPage;
