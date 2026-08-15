import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../../utils/apiClient';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import FollowButton from './FollowButton';

jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseSession = useSession as jest.Mock;
const mockedToast = toast as unknown as jest.Mock;

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('FollowButton', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows "Follow" when not following', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    renderWithClient(<FollowButton profileId="user-1" isFollowing={false} />);

    expect(screen.getByRole('button', { name: 'Follow' })).toBeInTheDocument();
  });

  it('shows "Following" when already following', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    renderWithClient(<FollowButton profileId="user-1" isFollowing={true} />);

    expect(
      screen.getByRole('button', { name: 'Following' })
    ).toBeInTheDocument();
  });

  it('switches to "Unfollow" on hover while following', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    renderWithClient(<FollowButton profileId="user-1" isFollowing={true} />);

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Following' }));

    expect(
      screen.getByRole('button', { name: 'Unfollow' })
    ).toBeInTheDocument();
  });

  it('blocks the request and toasts when not authenticated', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated' });
    renderWithClient(<FollowButton profileId="user-1" isFollowing={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));

    expect(mockedToast).toHaveBeenCalledWith('Sign in to follow');
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it('calls the follow endpoint when authenticated', async () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedApi.post.mockResolvedValueOnce({ data: { following: true } });

    renderWithClient(<FollowButton profileId="user-1" isFollowing={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/api/user/follow', {
        userId: 'user-1',
      })
    );
  });
});
