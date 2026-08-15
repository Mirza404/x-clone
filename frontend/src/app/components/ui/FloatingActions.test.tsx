import { render, screen, fireEvent } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useConversations } from '@/app/hooks/useConversations';
import FloatingActions from './FloatingActions';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));
jest.mock('@/app/hooks/useConversations', () => ({
  useConversations: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../messages/MessagePopover', () => {
  return function MockMessagePopover({ onClose }: { onClose: () => void }) {
    return (
      <div>
        <button onClick={onClose}>close-popover</button>
      </div>
    );
  };
});

const mockedUseSession = useSession as jest.Mock;
const mockedUseConversations = useConversations as jest.Mock;
const mockedToast = toast as unknown as jest.Mock;

describe('FloatingActions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('blocks chat and toasts when not authenticated', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated' });
    mockedUseConversations.mockReturnValue({ data: undefined });

    render(<FloatingActions />);
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));

    expect(mockedToast).toHaveBeenCalledWith('Sign in to use messages');
    expect(screen.queryByText('close-popover')).not.toBeInTheDocument();
  });

  it('opens the message popover when authenticated', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedUseConversations.mockReturnValue({ data: [] });

    render(<FloatingActions />);
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));

    expect(screen.getByText('close-popover')).toBeInTheDocument();
  });

  it('shows the sum of unread counts across conversations', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedUseConversations.mockReturnValue({
      data: [{ unreadCount: 2 }, { unreadCount: 3 }],
    });

    render(<FloatingActions />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show an unread badge when not authenticated', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated' });
    mockedUseConversations.mockReturnValue({
      data: [{ unreadCount: 2 }],
    });

    render(<FloatingActions />);

    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('shows a "Coming soon" toast for the Grok button', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated' });
    mockedUseConversations.mockReturnValue({ data: undefined });

    render(<FloatingActions />);
    fireEvent.click(screen.getByRole('button', { name: 'Grok' }));

    expect(mockedToast).toHaveBeenCalledWith('Coming soon');
  });
});
