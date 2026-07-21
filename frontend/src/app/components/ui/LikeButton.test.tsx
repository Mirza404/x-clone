import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../../utils/apiClient';
import LikeButton from './LikeButton';

jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'post-1' }),
}));

const mockedApi = api as jest.Mocked<typeof api>;

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('LikeButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the initial like state and count', () => {
    renderWithClient(
      <LikeButton
        type="post"
        targetId="post-1"
        authorId="user-1"
        initialLikes={['user-1', 'user-2']}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Unlike post' })
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('optimistically likes a post and posts to the post like endpoint', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} });

    renderWithClient(
      <LikeButton
        type="post"
        targetId="post-1"
        authorId="user-1"
        initialLikes={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Like post' }));

    expect(
      await screen.findByRole('button', { name: 'Unlike post' })
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/post/like'),
        { id: 'post-1' }
      )
    );
  });

  it('posts to the comment like endpoint for comment likes', async () => {
    mockedApi.post.mockResolvedValueOnce({ data: {} });

    renderWithClient(
      <LikeButton
        type="comment"
        targetId="comment-1"
        authorId="user-1"
        initialLikes={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Like post' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/post/post-1/comment/like'),
        { id: 'comment-1' }
      )
    );
  });

  it('reverts the optimistic update when the request fails', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('network error'));

    renderWithClient(
      <LikeButton
        type="post"
        targetId="post-1"
        authorId="user-1"
        initialLikes={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Like post' }));

    expect(
      await screen.findByRole('button', { name: 'Like post' })
    ).toBeInTheDocument();
  });
});
