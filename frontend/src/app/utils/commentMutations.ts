import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';

export function useCommentMutations() {
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const postId = useParams().id as string;
  const parentCommentId = useParams().commentId as string;
  const queryClient = useQueryClient();

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await axios.patch(
        `${serverUrl}/api/post/${postId}/comment/delete/${commentId}`
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment deleted successfully');
      queryClient.invalidateQueries({
        queryKey: ['infiniteComments', postId],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to delete the comment'
      );
    },
  });

  const newCommentMutation = useMutation({
    mutationFn: async ({
      postId,
      parentCommentId,
      content,
      email,
    }: {
      postId: string;
      parentCommentId?: string | null;
      content: string;
      email: string;
    }) => {
      const response = await axios.post(
        `${serverUrl}/api/post/${postId}/comment/new`,
        {
          parentCommentId,
          content,
          email,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment created successfully');
      queryClient.invalidateQueries({
        queryKey: ['infiniteComments', postId],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to create the comment'
      );
    },
  });

  const newReplyMutation = useMutation({
    mutationFn: async ({
      postId,
      parentCommentId,
      content,
      email,
    }: {
      postId: string;
      parentCommentId: string;
      content: string;
      email: string;
    }) => {
      const response = await axios.post(
        `${serverUrl}/api/post/${postId}/comment/new`,
        {
          parentCommentId,
          content,
          email,
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reply created successfully');
      queryClient.invalidateQueries({
        queryKey: ['comment-thread', postId, parentCommentId],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to create the reply'
      );
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const response = await axios.patch(
        `${serverUrl}/api/post/${postId}/comment/delete/${replyId}`
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reply deleted successfully');
      queryClient.invalidateQueries({
        queryKey: ['comment-thread', postId, parentCommentId],
      });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to delete the reply'
      );
    },
  });

  return {
    deleteCommentMutation,
    newCommentMutation,
    newReplyMutation,
    deleteReplyMutation,
  };
}
