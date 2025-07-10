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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
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
      const response = await axios.patch(
        `${serverUrl}/api/post/${postId}/comment/edit/${commentId}`,
        { content }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment edited successfully');
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['infiniteComments', postId] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to edit the comment'
      );
    },
  });

  return (
    <>
      <div className="flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm min-h-[116px]">
        <CustomLoadBar progress={progress} />
        <div className="flex flex-row bg-black bg-opacity-50 backdrop-blur-sm mt-0 w-[598px] mx-auto px-4 pt-2 border border-gray-700 shadow-lg">
          <div className="pt-2 mr-2">
            <img
              className="flex w-10 h-10 rounded-full"
              src={session?.user?.image ?? '/Logo.png'}
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col py-3 flex-1">
            <textarea
              ref={textareaRef}
              className="w-full min-h-[28px] py-0.5 text-white bg-black rounded-lg focus:outline-none text-xl resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 300)}px`;
              }}
            />
            <div className="flex justify-between mt-4">
              <button
                onClick={() =>
                  editCommentMutation.mutate({ commentId, content })
                }
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default EditCommentPage;