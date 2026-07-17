import { render, screen, fireEvent } from '@testing-library/react';
import { useSession, signIn, signOut } from 'next-auth/react';
import ProfileTab from './ProfileTab';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;

describe('ProfileTab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while the session is resolving', () => {
    mockedUseSession.mockReturnValue({ data: null, status: 'loading' });

    render(<ProfileTab />);

    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a Sign In button when there is no session', () => {
    mockedUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<ProfileTab />);

    const button = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(button);

    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/posts' });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('shows the signed-in user name and signs out on click', () => {
    mockedUseSession.mockReturnValue({
      data: { user: { name: 'Ada Lovelace', image: '/ada.png' } },
      status: 'authenticated',
    });

    render(<ProfileTab />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ada Lovelace'));

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
    expect(signIn).not.toHaveBeenCalled();
  });
});
