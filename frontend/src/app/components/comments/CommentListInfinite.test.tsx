import { render, screen, within, fireEvent } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import { usePostMutations } from '@/app/utils/postMutations';
import { useCommentMutations } from '../../utils/commentMutations';
import CommentListInfinite from './CommentListInfinite';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('@/app/utils/postMutations', () => ({
  usePostMutations: jest.fn(),
}));
jest.mock('../../utils/commentMutations', () => ({
  useCommentMutations: jest.fn(),
}));
jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: jest.fn(), inView: false }),
}));
jest.mock('../ui/LoadCircle', () => ({
  __esModule: true,
  default: () => <div role="status">Loading...</div>,
}));
jest.mock('./CommentItem', () => ({
  __esModule: true,
  default: ({
    comment,
    onDelete,
    onEdit,
  }: {
    comment: { id: string; content: string };
    onDelete: () => void;
    onEdit: () => void;
  }) => (
    <div data-testid={`comment-${comment.id}`}>
      <span>{comment.content}</span>
      <button onClick={onDelete}>Delete</button>
      <button onClick={onEdit}>Edit</button>
    </div>
  ),
}));

const mockedUseParams = useParams as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;
const mockedUsePostMutations = usePostMutations as jest.Mock;
const mockedUseCommentMutations = useCommentMutations as jest.Mock;

function mockMutations(overrides: {
  infinite?: Partial<{
    data: unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    status: string;
    isLoading: boolean;
    isError: boolean;
  }>;
  deleteMutate?: jest.Mock;
}) {
  mockedUsePostMutations.mockReturnValue({
    useFetchInfiniteComments: () => ({
      data: { pages: [] },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      status: 'success',
      isLoading: false,
      isError: false,
      ...overrides.infinite,
    }),
  });
  mockedUseCommentMutations.mockReturnValue({
    deleteCommentMutation: { mutate: overrides.deleteMutate ?? jest.fn() },
  });
}

describe('CommentListInfinite', () => {
  const push = jest.fn();

  beforeEach(() => {
    mockedUseParams.mockReturnValue({ id: 'post-1' });
    mockedUseRouter.mockReturnValue({ push });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while comments are loading', () => {
    mockMutations({ infinite: { isLoading: true, status: 'pending' } });

    render(<CommentListInfinite />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error message when the query fails', () => {
    mockMutations({ infinite: { isError: true } });

    render(<CommentListInfinite />);

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('shows "No comments yet" when there are none', () => {
    mockMutations({
      infinite: { data: { pages: [{ comments: [] }] } },
    });

    render(<CommentListInfinite />);

    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders each comment returned by the infinite query', () => {
    mockMutations({
      infinite: {
        data: {
          pages: [
            {
              comments: [
                { id: 'comment-1', content: 'First comment' },
                { id: 'comment-2', content: 'Second comment' },
              ],
            },
          ],
        },
      },
    });

    render(<CommentListInfinite />);

    expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByTestId('comment-comment-2')).toBeInTheDocument();
  });

  it('deletes the correct comment when its delete callback fires', () => {
    const deleteMutate = jest.fn();
    mockMutations({
      deleteMutate,
      infinite: {
        data: {
          pages: [{ comments: [{ id: 'comment-1', content: 'First' }] }],
        },
      },
    });

    render(<CommentListInfinite />);

    fireEvent.click(
      within(screen.getByTestId('comment-comment-1')).getByRole('button', {
        name: 'Delete',
      })
    );

    expect(deleteMutate).toHaveBeenCalledWith('comment-1');
  });

  it('navigates to the edit page when the edit callback fires', () => {
    mockMutations({
      infinite: {
        data: {
          pages: [{ comments: [{ id: 'comment-1', content: 'First' }] }],
        },
      },
    });

    render(<CommentListInfinite />);

    fireEvent.click(
      within(screen.getByTestId('comment-comment-1')).getByRole('button', {
        name: 'Edit',
      })
    );

    expect(push).toHaveBeenCalledWith(
      '/posts/post-1/comment/comment-1/edit'
    );
  });

  it('shows "Nothing more to load" once there is no next page', () => {
    mockMutations({
      infinite: {
        hasNextPage: false,
        data: {
          pages: [{ comments: [{ id: 'comment-1', content: 'First' }] }],
        },
      },
    });

    render(<CommentListInfinite />);

    expect(screen.getByText('Nothing more to load.')).toBeInTheDocument();
  });
});
