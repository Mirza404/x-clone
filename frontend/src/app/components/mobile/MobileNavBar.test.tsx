import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import MobileNavBar from './MobileNavBar';
import { useConversations } from '@/app/hooks/useConversations';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/app/hooks/useConversations', () => ({
  useConversations: jest.fn(),
}));

const mockedUsePathname = usePathname as jest.Mock;
const mockedUseConversations = useConversations as jest.Mock;

describe('MobileNavBar', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/posts');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows no badge when there are no unread messages', () => {
    mockedUseConversations.mockReturnValue({ data: [] });

    render(<MobileNavBar />);

    expect(screen.queryByLabelText(/unread messages/)).not.toBeInTheDocument();
  });

  it('shows the total unread count on the Messages tab', () => {
    mockedUseConversations.mockReturnValue({
      data: [{ unreadCount: 1 }, { unreadCount: 4 }],
    });

    render(<MobileNavBar />);

    expect(screen.getByLabelText('5 unread messages')).toHaveTextContent('5');
  });

  it('caps the badge at "9+"', () => {
    mockedUseConversations.mockReturnValue({
      data: [{ unreadCount: 42 }],
    });

    render(<MobileNavBar />);

    expect(screen.getByLabelText('42 unread messages')).toHaveTextContent('9+');
  });
});
