import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import NavMenu from './NavMenu';
import { useConversations } from '@/app/hooks/useConversations';
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

jest.mock('@/app/hooks/useConversations', () => ({
  useConversations: jest.fn(),
}));

jest.mock('@/app/utils/PostModalProvider', () => ({
  usePostModal: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUsePathname = usePathname as jest.Mock;
const mockedUseRouter = useRouter as jest.Mock;
const mockedUseConversations = useConversations as jest.Mock;
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

  it('shows no badge when there are no unread messages', () => {
    mockedUseConversations.mockReturnValue({ data: [] });

    render(<NavMenu />);

    expect(screen.queryByLabelText(/unread messages/)).not.toBeInTheDocument();
  });

  it('shows the total unread count on the Messages item', () => {
    mockedUseConversations.mockReturnValue({
      data: [{ unreadCount: 2 }, { unreadCount: 3 }],
    });

    render(<NavMenu />);

    expect(screen.getByLabelText('5 unread messages')).toHaveTextContent('5');
  });

  it('caps the badge at "9+"', () => {
    mockedUseConversations.mockReturnValue({
      data: [{ unreadCount: 20 }],
    });

    render(<NavMenu />);

    expect(screen.getByLabelText('20 unread messages')).toHaveTextContent('9+');
  });
});
