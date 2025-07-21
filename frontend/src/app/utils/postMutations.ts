import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import axios from 'axios';
import { fetchPosts, getPostsPaginated } from './fetchInfo';
import toast from 'react-hot-toast';
import { getCommentsPaginated } from './fetchInfo';
import { useMemo } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';

export const postMutations = () => {
  const pathname = usePathname();
  const postId = useParams().id as string;
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;
  const isCurrentPage = useMemo(
    () => pathname === `/posts/${postId}`,
    [pathname, postId]
  );

  function useFetchPosts() {
    return useQuery({
      queryKey: ['posts'],
      queryFn: fetchPosts,
    });
  }

  function useFetchInfiniteComments(postId: string) {
    return useInfiniteQuery({
      queryKey: ['infiniteComments', postId],
      queryFn: ({ pageParam = 1 }) => getCommentsPaginated(postId, pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.nextPage,
    });
  }

  function useFetchInfinitePosts() {
    return useInfiniteQuery({
      queryKey: ['infinitePosts'],
      queryFn: ({ pageParam = 1 }) => getPostsPaginated(pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.nextPage,
    });
  }

  function useDeletePost() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (id: string) => {
        const response = await axios.delete(`${serverUrl}/api/post/delete`, {
          data: { id },
        });
        return response.data;
      },
      onSuccess: (_, id) => {
        toast.success('Post deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['posts', id] });
        queryClient.invalidateQueries({ queryKey: ['infinitePosts'] });
        if (isCurrentPage) {
          queryClient.removeQueries({ queryKey: ['posts', id] });
        }
        if (isCurrentPage) {
          window.location.href = '/posts';
        }
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message || 'Failed to delete the post'
        );
        window.location.href = '/posts';
      },
    });
  }

  function useUpdatePost() {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        id,
        content,
        images,
      }: {
        id: string;
        content: string;
        images: string[];
      }) => {
        const response = await axios.patch(`${serverUrl}/api/post/edit`, {
          id,
          content,
          images,
        });
        return response.data;
      },
      onSuccess: (_, variables) => {
        toast.success('Post updated successfully');
        // Invalidate both the list and the specific post
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        queryClient.invalidateQueries({ queryKey: ['posts', variables.id] });
        queryClient.invalidateQueries({ queryKey: ['infinitePosts'] });
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message || 'Failed to update the post'
        );
      },
    });
  }

  return {
    useFetchPosts,
    useFetchInfinitePosts,
    useFetchInfiniteComments,
    useDeletePost,
    useUpdatePost,
  };
};
