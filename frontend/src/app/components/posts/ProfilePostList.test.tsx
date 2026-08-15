import { render, screen, within, fireEvent } from '@testing-library/react';
import { useProfileMutations } from '@/app/utils/profileMutations';
import { usePostMutations } from '@/app/utils/postMutations';
import ProfilePostList from './ProfilePostList';

jest.mock('@/app/utils/profileMutations', () => ({
  useProfileMutations: jest.fn(),
}));
jest.mock('@/app/utils/postMutations', () => ({
  usePostMutations: jest.fn(),
}));
jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: jest.fn(), inView: false }),
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

const mockedUseProfileMutations = useProfileMutations as jest.Mock;
const mockedUsePostMutations = usePostMutations as jest.Mock;

function mockMutations(overrides: {
  infinite?: Partial<{
    data: unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    status: string;
  }>;
  deleteMutate?: jest.Mock;
}) {
  mockedUseProfileMutations.mockReturnValue({
    useFetchInfiniteAuthorPosts: () => ({
      data: { pages: [] },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      status: 'success',
      ...overrides.infinite,
    }),
  });
  mockedUsePostMutations.mockReturnValue({
    useDeletePost: () => ({ mutate: overrides.deleteMutate ?? jest.fn() }),
  });
}

describe('ProfilePostList', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows skeleton rows while posts are loading', () => {
    mockMutations({ infinite: { status: 'pending' } });

    render(<ProfilePostList authorId="user-1" />);

    expect(screen.getAllByTestId('post-skeleton')).toHaveLength(3);
  });

  it('shows an error message when the query fails', () => {
    mockMutations({ infinite: { status: 'error' } });

    render(<ProfilePostList authorId="user-1" />);

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('shows an empty state when the author has no posts', () => {
    mockMutations({ infinite: { data: { pages: [{ posts: [] }] } } });

    render(<ProfilePostList authorId="user-1" />);

    expect(screen.getByText('No posts yet')).toBeInTheDocument();
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

    render(<ProfilePostList authorId="user-1" />);

    expect(screen.getByTestId('post-post-1')).toBeInTheDocument();
    expect(screen.getByTestId('post-post-2')).toBeInTheDocument();
  });

  it('deletes the correct post when its delete callback fires', () => {
    const deleteMutate = jest.fn();
    mockMutations({
      deleteMutate,
      infinite: {
        data: { pages: [{ posts: [{ id: 'post-1', content: 'First' }] }] },
      },
    });

    render(<ProfilePostList authorId="user-1" />);

    fireEvent.click(
      within(screen.getByTestId('post-post-1')).getByRole('button')
    );

    expect(deleteMutate).toHaveBeenCalledWith('post-1');
  });

  it('shows "Nothing more to load" once there is no next page', () => {
    mockMutations({
      infinite: {
        hasNextPage: false,
        data: { pages: [{ posts: [{ id: 'post-1', content: 'First' }] }] },
      },
    });

    render(<ProfilePostList authorId="user-1" />);

    expect(screen.getByText('Nothing more to load.')).toBeInTheDocument();
  });
});
