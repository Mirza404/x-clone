import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname, useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from './apiClient';
import { usePostMutations } from './postMutations';

jest.mock('./apiClient', () => ({
  __esModule: true,
  default: { delete: jest.fn(), patch: jest.fn() },
}));
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUsePathname = usePathname as jest.Mock;
const mockedUseParams = useParams as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;
const mockedToast = toast as unknown as {
  success: jest.Mock;
  error: jest.Mock;
};

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('usePostMutations', () => {
  const replace = jest.fn();

  beforeEach(() => {
    mockedUseParams.mockReturnValue({ id: 'post-1' });
    mockedUseRouter.mockReturnValue({ replace });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useDeletePost', () => {
    it('deletes the post without navigating when not on the post page', async () => {
      mockedUsePathname.mockReturnValue('/posts');
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => usePostMutations().useDeletePost(), {
        wrapper,
      });

      act(() => result.current.mutate('post-1'));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedApi.delete).toHaveBeenCalledWith('/api/post/delete', {
        data: { id: 'post-1' },
      });
      expect(mockedToast.success).toHaveBeenCalledWith(
        'Post deleted successfully'
      );
      expect(replace).not.toHaveBeenCalled();
    });

    it('navigates away when deleting the post currently being viewed', async () => {
      mockedUsePathname.mockReturnValue('/posts/post-1');
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => usePostMutations().useDeletePost(), {
        wrapper,
      });

      act(() => result.current.mutate('post-1'));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(replace).toHaveBeenCalledWith('/posts');
    });

    it('shows an error toast and does not navigate when deletion fails', async () => {
      mockedUsePathname.mockReturnValue('/posts/post-1');
      mockedApi.delete.mockRejectedValueOnce(new Error('network error'));

      const { result } = renderHook(() => usePostMutations().useDeletePost(), {
        wrapper,
      });

      act(() => result.current.mutate('post-1'));

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(mockedToast.error).toHaveBeenCalledWith('network error');
      expect(replace).not.toHaveBeenCalled();
    });
  });

  describe('useUpdatePost', () => {
    it('patches the post and shows a success toast', async () => {
      mockedUsePathname.mockReturnValue('/posts/post-1/editPost');
      mockedApi.patch.mockResolvedValueOnce({ data: {} });

      const { result } = renderHook(() => usePostMutations().useUpdatePost(), {
        wrapper,
      });

      act(() =>
        result.current.mutate({
          id: 'post-1',
          content: 'updated',
          images: [],
        })
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockedApi.patch).toHaveBeenCalledWith('/api/post/edit', {
        id: 'post-1',
        content: 'updated',
        images: [],
      });
      expect(mockedToast.success).toHaveBeenCalledWith(
        'Post updated successfully'
      );
    });

    it('shows an error toast when the update fails', async () => {
      mockedUsePathname.mockReturnValue('/posts/post-1/editPost');
      mockedApi.patch.mockRejectedValueOnce(new Error('network error'));

      const { result } = renderHook(() => usePostMutations().useUpdatePost(), {
        wrapper,
      });

      act(() =>
        result.current.mutate({
          id: 'post-1',
          content: 'updated',
          images: [],
        })
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(mockedToast.error).toHaveBeenCalledWith('network error');
    });
  });
});
