import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import NewComment from './NewComment';

jest.mock('axios');
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'post-1' }),
}));
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedUseSession = useSession as jest.Mock;

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('NewComment composer', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      data: { user: { email: 'ada@example.com', name: 'Ada' } },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('disables the Post button while the composer is empty', () => {
    renderWithClient(<NewComment />);
    fireEvent.error(screen.getByAltText('Ada'));

    expect(screen.getByRole('button', { name: 'Post' })).toBeDisabled();
  });

  it('enables the Post button once content is typed', () => {
    renderWithClient(<NewComment />);
    fireEvent.error(screen.getByAltText('Ada'));

    const textarea = screen.getByPlaceholderText("What's up?");
    fireEvent.change(textarea, { target: { value: 'Hello world' } });

    expect(screen.getByRole('button', { name: 'Post' })).toBeEnabled();
  });

  it('submits the comment with the post id and signed-in email', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: {} });

    renderWithClient(<NewComment />);
    fireEvent.error(screen.getByAltText('Ada'));

    const textarea = screen.getByPlaceholderText("What's up?");
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() =>
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/post/post-1/comment/new'),
        {
          parentCommentId: undefined,
          content: 'Hello world',
          email: 'ada@example.com',
        }
      )
    );
  });

  it('clears the textarea after a successful submit', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: {} });

    renderWithClient(<NewComment />);
    fireEvent.error(screen.getByAltText('Ada'));

    const textarea = screen.getByPlaceholderText(
      "What's up?"
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello world' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => expect(textarea.value).toBe(''));
  });
});
