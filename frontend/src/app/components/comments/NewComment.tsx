import React, {useState} from 'react';
import LoadingBar from '../ui/CustomLoadBar';
import { useSession } from 'next-auth/react';
import classNames from 'classnames';
import CustomToaster from '../ui/CustomToaster';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const NewComment = () => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);  
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const {data: session}= useSession();
  const [content, setContent] = useState('');
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

  function newCommentMutation() {
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async ({
        postId,
        content,
        name,
      }: {
        postId: string;
        content: string;
        name: string;
      }) => {
        const response = await axios.post(
          `${serverUrl}/api/post/${postId}/comment/new`,
          {
            postId,
            content,
            name,
          }
        );
        return response.data;
      },
      onSuccess: (_, variables) => {
        toast.success('Comment created successfully');
        // Invalidate the comments query for the specific post
        queryClient.invalidateQueries({
          queryKey: ['infiniteComments', variables.postId],
        });
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message || 'Failed to create the comment'
        );
      },
    });
  }
  
 function useDeleteComment() {
    const queryClient = useQueryClient();
  
    return useMutation({
      mutationFn: async ({
        commentId,
        postId,
      }: {
        commentId: string;
        postId: string;
      }) => {
        const response = await axios.delete(
          `${serverUrl}/api/post/${postId}/comment/delete/${commentId}`,
          {
            data: { commentId },
          }
        );
        return response.data;
      },
      onSuccess: (_, variables) => {
        toast.success('Comment deleted successfully');
        // Invalidate the comments query for the specific post
        queryClient.invalidateQueries({
          queryKey: ['infiniteComments', variables.postId],
        });
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message || 'Failed to delete the comment'
        );
      },
    });
  }




  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
    }
  };
  
  return (
    <>
      <div className="flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm w-[598px] min-h-[116px]">
        <LoadingBar progress={progress} />
        <div className="flex flex-row bg-black bg-opacity-50 backdrop-blur-sm mt-0 mx-auto px-4 pt-2 border border-gray-700 shadow-lg w-[598px]">
          <div className="pt-2 mr-2 min-w-[40px] w-[40px] flex-shrink-0">
            <img
              className="w-10 h-10 rounded-full"
              src={session?.user?.image ?? 'https://via.placeholder.com/150'}
              referrerPolicy="no-referrer"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          </div>
          <div className="flex flex-col py-3 flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              className="w-full h-7 py-0.5 text-white bg-black rounded-lg focus:outline-none text-xl overflow-hidden resize-none"
              placeholder="What is happening?!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const value = target.value;
                const minHeight = 28;
                const maxHeight = 300;

                if (value === '') {
                  target.style.height = `${minHeight}px`;
                } else {
                  target.style.height = `${minHeight}px`;
                  target.style.height = `${Math.min(
                    target.scrollHeight,
                    maxHeight
                  )}px`;
                }
              }}
            />
            <div className="w-full h-[48px] py-0.5 mt-1.5">
              <div className="flex flex-row w-full h-full items-center justify-between">
                <button
                  className={classNames(
                    'flex justify-center items-center text-center rounded-full px-3 h-9 text-base font-bold transition duration-300',
                    {
                      'bg-white text-black hover:bg-gray-300':
                        !loading && content.trim() !== '',
                      'bg-white text-black opacity-70 cursor-not-allowed':
                        loading || content.trim() === '',
                    }
                  )}
                //   onClick={() => newCommentMutation.mutate()} // ovdje treba mutaciju za new comment
                  disabled={loading || content.trim() === ''}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CustomToaster />
    </>
  );
};

export default NewComment;
