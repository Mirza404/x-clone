import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from './apiClient';
import toast from 'react-hot-toast';
import { useParams } from 'next/navigation';
import { getApiErrorMessage } from './apiError';

export function useCommentMutations() {
  const postId = useParams().id as string;
  const parentCommentId = useParams().commentId as string;
  const queryClient = useQueryClient();

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await api.patch(
        `/api/post/${postId}/comment/delete/${commentId}`
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment deleted successfully');
      queryClient.invalidateQueries({
        queryKey: ['infiniteComments', postId],
      });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete the comment'));
    },
  });

  const newCommentMutation = useMutation({
    mutationFn: async ({
      postId,
      parentCommentId,
      content,
    }: {
      postId: string;
      parentCommentId?: string | null;
      content: string;
    }) => {
      const response = await api.post(`/api/post/${postId}/comment/new`, {
        parentCommentId,
        content,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Comment created successfully');
      queryClient.invalidateQueries({
        queryKey: ['infiniteComments', postId],
      });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create the comment'));
    },
  });

  const newReplyMutation = useMutation({
    mutationFn: async ({
      postId,
      parentCommentId,
      content,
    }: {
      postId: string;
      parentCommentId: string;
      content: string;
    }) => {
      const response = await api.post(`/api/post/${postId}/comment/new`, {
        parentCommentId,
        content,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reply created successfully');
      queryClient.invalidateQueries({
        queryKey: ['comment-thread', postId, parentCommentId],
      });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create the reply'));
    },
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const response = await api.patch(
        `/api/post/${postId}/comment/delete/${replyId}`
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Reply deleted successfully');
      queryClient.invalidateQueries({
        queryKey: ['comment-thread', postId, parentCommentId],
      });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to delete the reply'));
    },
  });

  return {
    deleteCommentMutation,
    newCommentMutation,
    newReplyMutation,
    deleteReplyMutation,
  };
}
