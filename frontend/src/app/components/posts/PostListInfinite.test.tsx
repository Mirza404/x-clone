import { render, screen, within, fireEvent } from '@testing-library/react';
import PostListInfinite from './PostListInfinite';
import { usePostMutations } from '@/app/utils/postMutations';

jest.mock('@/app/utils/postMutations', () => ({
  usePostMutations: jest.fn(),
}));

jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: jest.fn(), inView: false }),
}));

jest.mock('../ui/LoadCircle', () => ({
  __esModule: true,
  default: () => <div role="status">Loading...</div>,
}));

jest.mock('./PostItem', () => ({
  __esModule: true,
  default: ({
    post,
    onDelete,
  }: {
    post: { id: string; content: string };
    onDelete: () => void;
  }) => (
    <div data-testid={`post-${post.id}`}>
      <span>{post.content}</span>
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
}));

const mockedUsePostMutations = usePostMutations as jest.Mock;

function mockMutations(overrides: {
  postsQuery?: Partial<{ isLoading: boolean; isError: boolean }>;
  infinite?: Partial<{
    data: unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    status: string;
  }>;
  deleteMutate?: jest.Mock;
}) {
  mockedUsePostMutations.mockReturnValue({
    useFetchPosts: () => ({
      isLoading: false,
      isError: false,
      ...overrides.postsQuery,
    }),
    useFetchInfinitePosts: () => ({
      data: { pages: [] },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      status: 'success',
      ...overrides.infinite,
    }),
    useDeletePost: () => ({ mutate: overrides.deleteMutate ?? jest.fn() }),
  });
}

describe('PostListInfinite', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows skeleton rows while posts are loading', () => {
    mockMutations({
      postsQuery: { isLoading: true },
      infinite: { status: 'pending' },
    });

    const { container } = render(<PostListInfinite />);

    expect(container.querySelectorAll('.animate-pulse').length).toBe(5);
  });

  it('shows an error message and retry button when the posts query fails', () => {
    mockMutations({
      postsQuery: { isError: true },
      infinite: { status: 'error' },
    });

    render(<PostListInfinite />);

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders each post returned by the infinite query', () => {
    mockMutations({
      infinite: {
        data: {
          pages: [
            {
              posts: [
                { id: 'post-1', content: 'First post' },
                { id: 'post-2', content: 'Second post' },
              ],
            },
          ],
        },
      },
    });

    render(<PostListInfinite />);

    expect(screen.getByTestId('post-post-1')).toBeInTheDocument();
    expect(screen.getByText('First post')).toBeInTheDocument();
    expect(screen.getByTestId('post-post-2')).toBeInTheDocument();
    expect(screen.getByText('Second post')).toBeInTheDocument();
  });

  it('deletes the correct post when its delete callback fires', () => {
    const deleteMutate = jest.fn();
    mockMutations({
      deleteMutate,
      infinite: {
        data: { pages: [{ posts: [{ id: 'post-1', content: 'First post' }] }] },
      },
    });

    render(<PostListInfinite />);

    fireEvent.click(
      within(screen.getByTestId('post-post-1')).getByRole('button')
    );

    expect(deleteMutate).toHaveBeenCalledWith('post-1');
  });

  it('shows "Nothing more to load" once there is no next page', () => {
    mockMutations({
      infinite: {
        hasNextPage: false,
        data: { pages: [{ posts: [{ id: 'post-1', content: 'First post' }] }] },
      },
    });

    render(<PostListInfinite />);

    expect(screen.getByText('Nothing more to load.')).toBeInTheDocument();
  });

  it('renders no sentinel text while another page is available', () => {
    mockMutations({
      infinite: {
        hasNextPage: true,
        data: { pages: [{ posts: [{ id: 'post-1', content: 'First post' }] }] },
      },
    });

    render(<PostListInfinite />);

    expect(screen.queryByText('Nothing more to load.')).not.toBeInTheDocument();
  });
});
