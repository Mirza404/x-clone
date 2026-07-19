import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import PostItem from './PostItem';
import type { Post } from '@/app/types/Post';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useParams: jest.fn(() => ({ id: 'post-1' })),
}));

jest.mock('@/app/utils/fetchInfo', () => ({
  getPost: jest.fn().mockResolvedValue(null),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;
const mockedUsePathname = usePathname as jest.Mock;

const basePost: Post = {
  id: 'post-1',
  author: 'user-1',
  content: 'Hello world',
  likes: ['user-2'] as unknown as [string],
  images: [] as unknown as [string],
  name: 'Ada Lovelace',
  createdAt: new Date('2026-01-01'),
  authorImage: '/ada.png',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('PostItem', () => {
  const push = jest.fn();

  beforeEach(() => {
    mockedUseSession.mockReturnValue({ data: { user: { id: 'user-1' } } });
    mockedUseRouter.mockReturnValue({ push });
    mockedUsePathname.mockReturnValue('/posts');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the author name, content, and avatar', () => {
    renderWithClient(<PostItem post={basePost} onDelete={jest.fn()} />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByAltText("Ada Lovelace's profile")).toBeInTheDocument();
  });

  it('navigates to the post detail page when the card is clicked', () => {
    renderWithClient(<PostItem post={basePost} onDelete={jest.fn()} />);

    fireEvent.click(screen.getByText('Hello world'));

    expect(push).toHaveBeenCalledWith('/posts/post-1');
  });

  it('navigates to the post detail page when the reply button is clicked, without double-firing the card click', () => {
    renderWithClient(<PostItem post={basePost} onDelete={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/posts/post-1');
  });

  it('truncates long content behind a "Show more" toggle', () => {
    const longPost = { ...basePost, content: 'a'.repeat(350) };
    renderWithClient(<PostItem post={longPost} onDelete={jest.fn()} />);

    const toggle = screen.getByRole('button', { name: 'Show more' });
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(
      screen.getByRole('button', { name: 'Show less' })
    ).toBeInTheDocument();
  });

  it('only shows the post management menu to the post author', () => {
    mockedUseSession.mockReturnValue({
      data: { user: { id: 'someone-else' } },
    });
    renderWithClient(<PostItem post={basePost} onDelete={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    expect(screen.queryByText('Edit post')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete post')).not.toBeInTheDocument();
  });

  it('shows the post management menu to the post author', () => {
    renderWithClient(<PostItem post={basePost} onDelete={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    expect(screen.getByText('Edit post')).toBeInTheDocument();
    expect(screen.getByText('Delete post')).toBeInTheDocument();
  });
});
