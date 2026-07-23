import { render, screen, fireEvent } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import MessageThread from './MessageThread';
import { useMessages } from '@/app/hooks/useMessages';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/app/hooks/useMessages', () => ({
  useMessages: jest.fn(),
}));

jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: jest.fn(), inView: false }),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUseMessages = useMessages as jest.Mock;

function mockMessages(overrides: Partial<ReturnType<typeof useMessages>>) {
  mockedUseMessages.mockReturnValue({
    messages: [],
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    sendMessage: jest.fn(),
    ...overrides,
  });
}

describe('MessageThread', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    mockedUseSession.mockReturnValue({ data: { user: { id: 'me' } } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while history is loading', () => {
    mockMessages({ isLoading: true });
    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the participant name and messages', () => {
    mockMessages({
      messages: [
        {
          _id: 'm1',
          conversation: 'conv-1',
          sender: 'user-2',
          content: 'hey',
          readBy: [],
          deliveredTo: [],
          createdAt: new Date(0).toISOString(),
        },
      ],
    });

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('hey')).toBeInTheDocument();
  });

  it('calls sendMessage from the composer', () => {
    const sendMessage = jest.fn();
    mockMessages({ sendMessage });

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Start a new message'), {
      target: { value: 'hi there' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(sendMessage).toHaveBeenCalledWith('hi there');
  });

  it('shows "Read" on the last own message once the peer has seen it', () => {
    mockMessages({
      messages: [
        {
          _id: 'm1',
          conversation: 'conv-1',
          sender: 'me',
          content: 'hi',
          readBy: [],
          deliveredTo: [],
          createdAt: new Date(0).toISOString(),
        },
        {
          _id: 'm2',
          conversation: 'conv-1',
          sender: 'me',
          content: 'you there?',
          readBy: ['user-2'],
          deliveredTo: [],
          createdAt: new Date(1).toISOString(),
        },
      ],
    });

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('does not show "Read" on an earlier own message even if it was read', () => {
    mockMessages({
      messages: [
        {
          _id: 'm1',
          conversation: 'conv-1',
          sender: 'me',
          content: 'hi',
          readBy: ['user-2'],
          deliveredTo: [],
          createdAt: new Date(0).toISOString(),
        },
        {
          _id: 'm2',
          conversation: 'conv-1',
          sender: 'me',
          content: 'you there?',
          readBy: [],
          deliveredTo: [],
          createdAt: new Date(1).toISOString(),
        },
      ],
    });

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    expect(screen.queryByText('Read')).not.toBeInTheDocument();
  });

  it('renders a back button that calls onBack when provided', () => {
    mockMessages({});
    const onBack = jest.fn();

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
        onBack={onBack}
      />
    );

    fireEvent.click(screen.getByLabelText('Back to conversations'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
