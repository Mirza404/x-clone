import { render, screen, fireEvent } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import type { Comment } from '../../types/Comment';
import ReplyItem from './ReplyItem';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  usePathname: jest.fn(),
  useRouter: jest.fn(),
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

function baseReply(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'reply-1',
    author: 'author-1',
    content: 'Hello world',
    images: [],
    likes: [],
    name: 'Jane Doe',
    postId: 'post-1',
    parentComment: 'comment-1',
    replies: [],
    createdAt: new Date(),
    authorImage: '',
    ...overrides,
  };
}

describe('ReplyItem', () => {
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
    render(
      <ReplyItem reply={baseReply()} onDelete={jest.fn()} onEdit={jest.fn()} />
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('@janedoe')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows "No content" when the reply has no text', () => {
    render(
      <ReplyItem
        reply={baseReply({ content: '' })}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('truncates long content and expands on "Show more"', () => {
    const longContent = 'a'.repeat(220);
    render(
      <ReplyItem
        reply={baseReply({ content: longContent })}
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    expect(screen.getByText('a'.repeat(200))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show more' }));

    expect(screen.getByText(longContent)).toBeInTheDocument();
  });

  it('navigates to the comment thread when the body is clicked', () => {
    render(
      <ReplyItem reply={baseReply()} onDelete={jest.fn()} onEdit={jest.fn()} />
    );

    fireEvent.click(screen.getByText('Hello world'));

    expect(push).toHaveBeenCalledWith('/posts/post-1/comment/reply-1');
  });

  it('does not navigate when clicking the more-options button', () => {
    render(
      <ReplyItem reply={baseReply()} onDelete={jest.fn()} onEdit={jest.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    expect(push).not.toHaveBeenCalled();
  });

  it('shows the dropdown menu only for the reply author', () => {
    render(
      <ReplyItem reply={baseReply()} onDelete={jest.fn()} onEdit={jest.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    expect(screen.getByText('Delete comment')).toBeInTheDocument();
  });

  it('does not show the dropdown menu for other users replies', () => {
    mockedUseSession.mockReturnValue({ data: { user: { id: 'someone-else' } } });
    render(
      <ReplyItem reply={baseReply()} onDelete={jest.fn()} onEdit={jest.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    expect(screen.queryByText('Delete comment')).not.toBeInTheDocument();
  });
});
