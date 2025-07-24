'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CustomLoadBar from '@/app/components/ui/CustomLoadBar';
import LoadCircle from '@/app/components/ui/LoadCircle';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';
import { getCommentById } from '@/app/utils/fetchInfo';
import { useQuery } from '@tanstack/react-query';
import { useEnterSubmit } from '@/app/utils/formSubmit';

const EditCommentPage = () => {
  const params = useParams();
  const postId = params.id as string;
  const commentId = params.commentId as string;
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

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

      const response = await axios.patch(
        `${serverUrl}/api/post/${postId}/comment/edit/${commentId}`,
        { content },
        { headers: { 'Content-Type': 'application/json' } }
      );

      setProgress(100);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment updated successfully');
      queryClient.invalidateQueries({ queryKey: ['infiniteComments', postId] });
      setProgress(100);
      setLoading(false);
      setTimeout(() => {
        router.back();
      }, 1000);
    },
    onError: (error: any) => {
      setLoading(false);
      setProgress(0);
      toast.error(
        error.response?.data?.message || 'Failed to update the comment'
      );
    },
  });

  const handleSave = () => {
    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    console.log('Saving comment with content:', content);

    editCommentMutation.mutate({ commentId, content });
  };

  const handleCancel = () => {
    router.back();
  };

  useEffect(() => {
    if (comment?.content && content === '') {
      setContent(comment.content);
    }
  }, [comment]);

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

  if (isError || !commentData || commentData.length === 0) {
    return <div>Something went wrong loading the comment.</div>;
  }

  return (
    <>
      <div className="flex justify-center bg-black bg-opacity-50 backdrop-blur-sm max-h-100">
        <CustomLoadBar progress={progress} />

        <div className="flex flex-row bg-black bg-opacity-50 backdrop-blur-sm mt-0 w-[598px] mx-auto px-4 pt-2 border border-gray-700 shadow-lg">
          <div className="pt-2 mr-2">
            <img
              className="flex w-10 h-10 rounded-full object-cover"
              src={session?.user?.image ?? '/Logo.png'}
              alt="User avatar"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex flex-col py-3 flex-1">
            <div className="mb-2">
              <span className="text-gray-400 text-sm">Editing comment</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (loading || content.trim() === '') return;

                handleSave;
                setContent('');
              }}
            >
              <textarea
                ref={textareaRef}
                className="w-full min-h-[28px] py-0.5 text-white bg-transparent border-none focus:outline-none text-xl resize-none"
                onKeyDown={useEnterSubmit({
                  loading,
                  content,
                  onSubmit: handleSave,
                })}
                maxLength={380}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
              />

              <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-700">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 text-sm">
                    {content.length}/380 characters
                  </span>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-4 py-2 bg-black text-white  border border-gray-700 rounded-full hover:bg-gray-300 hover:text-black hover:border-black  transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={loading || !content.trim()}
                    className="px-4 py-2 bg-white font-bold text-black rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
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
