import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import axios from 'axios';
import { fetchPosts, getPostsPaginated } from './fetchInfo';
import toast from 'react-hot-toast';

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL;

export function useFetchPosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });
}

export function useFetchInfinitePosts() {
  return useInfiniteQuery({
    queryKey: ['infinitePosts'],
    queryFn: ({ pageParam = 1 }) => getPostsPaginated(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

export function useCreatePost() {}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axios.delete(`${serverUrl}/api/post/delete`, {
        data: { id },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Post deleted successfully');
      // Invalidate both queries
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['infinitePosts'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete the post');
    },
  });
}

export function useUpdatePost() {
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
      toast.error(error.response?.data?.message || 'Failed to update the post');
    },
  });
}
