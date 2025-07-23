'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CustomLoadBar from '@/app/components/ui/CustomLoadBar';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';

const EditCommentPage = () => {
  const params = useParams();
  const postId = params.id as string;
  const commentId = params.commentId as string;
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const { data: session } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
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
        { content }
      );

      setProgress(100);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment updated successfully');
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['infiniteComments', postId] });

      // Navigate back after a short delay
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [content]);

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

  return (
    <>
      <div className="flex justify-center bg-black bg-opacity-50 backdrop-blur-sm max-h-100">
        {/* Insert your custom loading bar here */}
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

            <textarea
              ref={textareaRef}
              className="w-full min-h-[28px] py-0.5 text-white bg-transparent border-none focus:outline-none text-xl resize-none placeholder-gray-500"
              maxLength={380} 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
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
                  className="px-4 py-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  disabled={loading || !content.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditCommentPage;
