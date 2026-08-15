import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from './apiClient';
import { useProfileMutations } from './profileMutations';
import type { Profile } from '../types/User';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedToast = toast as unknown as { success: jest.Mock; error: jest.Mock };

function baseProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'user-1',
    name: 'Jane Doe',
    image: null,
    postCount: 3,
    isFollowing: false,
    isSelf: false,
    followersCount: 10,
    followingCount: 5,
    ...overrides,
  };
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useProfileMutations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useToggleFollow', () => {
    it('optimistically flips isFollowing and bumps the follower count', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      queryClient.setQueryData(['profile', 'user-1'], baseProfile());
      mockedApi.post.mockResolvedValueOnce({ data: { following: true } });

      const { result } = renderHook(
        () => useProfileMutations().useToggleFollow('user-1'),
        { wrapper: makeWrapper(queryClient) }
      );

      act(() => result.current.mutate());

      await waitFor(() =>
        expect(
          queryClient.getQueryData<Profile>(['profile', 'user-1'])
        ).toMatchObject({ isFollowing: true, followersCount: 11 })
      );
    });

    it('rolls back the optimistic update when the request fails', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      queryClient.setQueryData(['profile', 'user-1'], baseProfile());
      mockedApi.post.mockRejectedValueOnce(new Error('network error'));

      const { result } = renderHook(
        () => useProfileMutations().useToggleFollow('user-1'),
        { wrapper: makeWrapper(queryClient) }
      );

      act(() => result.current.mutate());

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(
        queryClient.getQueryData<Profile>(['profile', 'user-1'])
      ).toMatchObject({ isFollowing: false, followersCount: 10 });
      expect(mockedToast.error).toHaveBeenCalledWith('network error');
    });
  });
});
