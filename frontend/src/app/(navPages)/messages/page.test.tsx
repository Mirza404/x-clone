import { render, screen, fireEvent } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import MessagesPage from './page';
import { useConversations } from '@/app/hooks/useConversations';
import { useMessages } from '@/app/hooks/useMessages';
import { useTyping } from '@/app/hooks/useTyping';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/app/hooks/useConversations', () => ({
  useConversations: jest.fn(),
}));

jest.mock('@/app/hooks/useMessages', () => ({
  useMessages: jest.fn(),
}));

jest.mock('@/app/hooks/useTyping', () => ({
  useTyping: jest.fn(),
}));

jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: jest.fn(), inView: false }),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUseConversations = useConversations as jest.Mock;
const mockedUseMessages = useMessages as jest.Mock;
const mockedUseTyping = useTyping as jest.Mock;

describe('MessagesPage', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    mockedUseMessages.mockReturnValue({
      messages: [],
      isLoading: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      sendMessage: jest.fn(),
    });
    mockedUseTyping.mockReturnValue({
      isPeerTyping: false,
      notifyTyping: jest.fn(),
      stopTypingNow: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the auth wall when unauthenticated', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated' });
    mockedUseConversations.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<MessagesPage />);

    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('shows an empty thread placeholder before selecting a conversation', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedUseConversations.mockReturnValue({
      data: [
        {
          id: 'conv-1',
          participant: { id: 'user-2', name: 'Ada', image: null },
          lastMessage: null,
          lastMessageAt: new Date(0).toISOString(),
          unreadCount: 0,
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<MessagesPage />);

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Select a message')).toBeInTheDocument();
  });

  it('selects a conversation and renders the thread', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedUseConversations.mockReturnValue({
      data: [
        {
          id: 'conv-1',
          participant: { id: 'user-2', name: 'Ada', image: null },
          lastMessage: null,
          lastMessageAt: new Date(0).toISOString(),
          unreadCount: 0,
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<MessagesPage />);

    fireEvent.click(screen.getByText('Ada'));

    expect(screen.queryByText('Select a message')).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Start a new message')
    ).toBeInTheDocument();
  });
});
