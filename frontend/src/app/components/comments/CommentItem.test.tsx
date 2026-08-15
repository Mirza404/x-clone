import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import type { Comment } from '../../types/Comment';
import CommentItem from './CommentItem';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));
jest.mock('@/app/utils/fetchInfo', () => ({
  getComment: jest.fn().mockResolvedValue(null),
}));
jest.mock('../ui/LikeButton', () => {
  return function MockLikeButton() {
    return <div>like-button</div>;
  };
});

const mockedUseSession = useSession as jest.Mock;
const mockedUseParams = useParams as jest.Mock;
const mockedUsePathname = usePathname as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;

function baseComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-1',
    author: 'author-1',
    content: 'Hello world',
    images: [],
    likes: [],
    name: 'Jane Doe',
    postId: 'post-1',
    parentComment: null,
    replies: [],
    createdAt: new Date(),
    authorImage: '',
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('CommentItem', () => {
  const push = jest.fn();

  beforeEach(() => {
    mockedUseParams.mockReturnValue({ id: 'post-1' });
    mockedUsePathname.mockReturnValue('/posts/post-1');
    mockedUseRouter.mockReturnValue({ push });
    mockedUseSession.mockReturnValue({ data: { user: { id: 'author-1' } } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders author name, handle, and content', () => {
    renderWithClient(
      <CommentItem
        comment={baseComment()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('@janedoe')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('truncates long content and expands on "Show more"', () => {
    const longContent = 'a'.repeat(320);
    renderWithClient(
      <CommentItem
        comment={baseComment({ content: longContent })}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    expect(screen.getByText('a'.repeat(300))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));

    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('navigates to the comment thread when the body is clicked', () => {
    renderWithClient(
      <CommentItem
        comment={baseComment()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText('Hello world'));

    expect(push).toHaveBeenCalledWith('/posts/post-1/comment/comment-1');
  });

  it('does not navigate when clicking the more-options button', () => {
    renderWithClient(
      <CommentItem
        comment={baseComment()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    expect(push).not.toHaveBeenCalled();
  });

  it('shows the dropdown menu only for the comment author', () => {
    renderWithClient(
      <CommentItem
        comment={baseComment()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    expect(screen.getByText('Delete comment')).toBeInTheDocument();
  });

  it('does not show the dropdown menu for other users comments', () => {
    mockedUseSession.mockReturnValue({
      data: { user: { id: 'someone-else' } },
    });
    renderWithClient(
      <CommentItem
        comment={baseComment()}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    expect(screen.queryByText('Delete comment')).not.toBeInTheDocument();
  });
});
