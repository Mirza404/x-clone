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
import EditContentForm from '@/app/utils/EditContentForm';
import { getCommentById } from '@/app/utils/fetchInfo';
import { useQuery } from '@tanstack/react-query';

const EditCommentPage = () => {
  const params = useParams();
  const postId = params.id as string;
  const commentId = params.commentId as string;
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
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
  console.log('Comment Data content:', comment?.content);

  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(comment ? comment?.content : '');
  const [progress, setProgress] = useState(0);
  const router = useRouter();
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
    editCommentMutation.mutate({ commentId, content });
  };

  const handleCancel = () => {
    router.back();
  };

  useEffect(() => {
    if (comment?.content) {
      setContent(comment?.content);
    }
  }, [comment]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [content]);

  if (isLoading)
    return (
      <>
        <LoadCircle />
      </>
    );
  if (isError || !commentData || commentData.length === 0) {
    return <div>Something went wrong loading the comment.</div>;
  }
  // Auto-resize textarea

  return (
    <>
      {content  && (
        <EditContentForm
          initialContent={content}
          handleSave={handleSave}
          handleCancel={handleCancel}
        />
      )}
    </>
  );
};

export default EditCommentPage;
