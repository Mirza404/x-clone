import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import NavMenu from './NavMenu';
import { usePostModal } from '@/app/utils/PostModalProvider';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('@/app/utils/PostModalProvider', () => ({
  usePostModal: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUsePathname = usePathname as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;
const mockedUsePostModal = usePostModal as jest.Mock;

describe('NavMenu', () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'me', name: 'Me' } },
    });
    mockedUsePathname.mockReturnValue('/posts');
    mockedUseRouter.mockReturnValue({ push: jest.fn() });
    mockedUsePostModal.mockReturnValue({ openPostModal: jest.fn() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the feed nav items', () => {
    render(<NavMenu />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('does not render a Messages item (messages has its own layout + entry point)', () => {
    render(<NavMenu />);

    expect(screen.queryByText('Messages')).not.toBeInTheDocument();
  });
});
