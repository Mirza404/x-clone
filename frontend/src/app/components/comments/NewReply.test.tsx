import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import api from '../../utils/apiClient';
import NewReply from './NewReply';

jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'post-1' }),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseSession = useSession as jest.Mock;
const mockedToast = toast as unknown as jest.Mock & {
  success: jest.Mock;
  error: jest.Mock;
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('NewReply', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('blocks submission and toasts when not authenticated', () => {
    mockedUseSession.mockReturnValue({ data: null });
    renderWithClient(
      <NewReply postId="post-1" parentCommentId="comment-1" content="" />
    );

    fireEvent.change(screen.getByPlaceholderText('Write a reply...'), {
      target: { value: 'hi there' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    expect(mockedToast).toHaveBeenCalledWith('Sign in to reply');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('submits the reply and clears the textarea on success', async () => {
    mockedUseSession.mockReturnValue({
      data: { user: { name: 'Test', image: null } },
    });
    mockedApi.post.mockResolvedValueOnce({ data: {} });

    renderWithClient(
      <NewReply postId="post-1" parentCommentId="comment-1" content="" />
    );

    const textarea = screen.getByPlaceholderText('Write a reply...');
    fireEvent.change(textarea, { target: { value: 'hi there' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/api/post/post-1/comment/new',
        {
          parentCommentId: 'comment-1',
          content: 'hi there',
          images: [],
        }
      )
    );
    await waitFor(() => expect(textarea).toHaveValue(''));
  });

  it('shows an error toast when the reply fails', async () => {
    mockedUseSession.mockReturnValue({
      data: { user: { name: 'Test', image: null } },
    });
    mockedApi.post.mockRejectedValueOnce(new Error('network error'));

    renderWithClient(
      <NewReply postId="post-1" parentCommentId="comment-1" content="" />
    );

    fireEvent.change(screen.getByPlaceholderText('Write a reply...'), {
      target: { value: 'hi there' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    await waitFor(() =>
      expect(mockedToast.error).toHaveBeenCalledWith(
        'Failed to post reply. Please try again.'
      )
    );
  });

  it('does not double-submit when the form is submitted', async () => {
    mockedUseSession.mockReturnValue({
      data: { user: { name: 'Test', image: null } },
    });
    mockedApi.post.mockResolvedValueOnce({ data: {} });

    renderWithClient(
      <NewReply postId="post-1" parentCommentId="comment-1" content="" />
    );

    fireEvent.change(screen.getByPlaceholderText('Write a reply...'), {
      target: { value: 'hi there' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(1));
  });

  it('disables the Reply button while content is empty', () => {
    mockedUseSession.mockReturnValue({
      data: { user: { name: 'Test', image: null } },
    });
    renderWithClient(
      <NewReply postId="post-1" parentCommentId="comment-1" content="" />
    );

    expect(screen.getByRole('button', { name: 'Reply' })).toBeDisabled();
  });
});
