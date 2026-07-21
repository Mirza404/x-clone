import {
  useMutation,
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from './apiClient';
import { getPostsByAuthorPaginated } from './fetchInfo';
import { getApiErrorMessage } from './apiError';
import type { Profile } from '../types/User';

async function fetchProfile(id: string): Promise<Profile | null> {
  try {
    const response = await api.get(`/api/user/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
}

export const useProfileMutations = () => {
  function useFetchProfile(id: string) {
    return useQuery({
      queryKey: ['profile', id],
      queryFn: () => fetchProfile(id),
      enabled: Boolean(id),
    });
  }

  function useFetchInfiniteAuthorPosts(authorId: string) {
    return useInfiniteQuery({
      queryKey: ['infinitePosts', 'author', authorId],
      queryFn: ({ pageParam = 1 }) =>
        getPostsByAuthorPaginated(authorId, pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.nextPage,
      enabled: Boolean(authorId),
    });
  }

  function useToggleFollow(profileId: string) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        const response = await api.post('/api/user/follow', {
          userId: profileId,
        });
        return response.data as { following: boolean };
      },
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: ['profile', profileId] });
        const previous = queryClient.getQueryData<Profile>([
          'profile',
          profileId,
        ]);

        if (previous) {
          queryClient.setQueryData<Profile>(['profile', profileId], {
            ...previous,
            isFollowing: !previous.isFollowing,
            followersCount: previous.isFollowing
              ? previous.followersCount - 1
              : previous.followersCount + 1,
          });
        }

        return { previous };
      },
      onError: (
        error: unknown,
        _variables,
        context?: { previous?: Profile }
      ) => {
        if (context?.previous) {
          queryClient.setQueryData(['profile', profileId], context.previous);
        }
        toast.error(getApiErrorMessage(error, 'Failed to update follow'));
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ['profile', profileId] });
      },
    });
  }

  return {
    useFetchProfile,
    useFetchInfiniteAuthorPosts,
    useToggleFollow,
  };
};
