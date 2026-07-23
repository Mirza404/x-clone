import { render, screen, fireEvent } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import MessageThread from './MessageThread';
import { useMessages } from '@/app/hooks/useMessages';
import { useTyping } from '@/app/hooks/useTyping';
import { useSocketContext } from '@/app/utils/SocketProvider';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/app/hooks/useMessages', () => ({
  useMessages: jest.fn(),
}));

jest.mock('@/app/hooks/useTyping', () => ({
  useTyping: jest.fn(),
}));

jest.mock('@/app/utils/SocketProvider', () => ({
  useSocketContext: jest.fn(),
}));

jest.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: jest.fn(), inView: false }),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUseMessages = useMessages as jest.Mock;
const mockedUseTyping = useTyping as jest.Mock;
const mockedUseSocketContext = useSocketContext as jest.Mock;

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

function mockTyping(overrides: Partial<ReturnType<typeof useTyping>> = {}) {
  mockedUseTyping.mockReturnValue({
    isPeerTyping: false,
    notifyTyping: jest.fn(),
    stopTypingNow: jest.fn(),
    ...overrides,
  });
}

describe('MessageThread', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    mockedUseSession.mockReturnValue({ data: { user: { id: 'me' } } });
    mockTyping();
    mockedUseSocketContext.mockReturnValue({ onlineUsers: {} });
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

  it('calls stopTypingNow before sendMessage when the composer submits', () => {
    const sendMessage = jest.fn();
    const stopTypingNow = jest.fn();
    mockMessages({ sendMessage });
    mockTyping({ stopTypingNow });

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

    expect(stopTypingNow).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith('hi there');
  });

  it('calls notifyTyping when the composer input changes', () => {
    const notifyTyping = jest.fn();
    mockMessages({});
    mockTyping({ notifyTyping });

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Start a new message'), {
      target: { value: 'h' },
    });

    expect(notifyTyping).toHaveBeenCalled();
  });

  it('shows a typing indicator when the peer is typing', () => {
    mockMessages({});
    mockTyping({ isPeerTyping: true });

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    expect(screen.getByText('Ada is typing')).toBeInTheDocument();
  });

  it('hides the typing indicator when the peer is not typing', () => {
    mockMessages({});
    mockTyping({ isPeerTyping: false });

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    expect(screen.queryByText('Ada is typing')).not.toBeInTheDocument();
  });

  it('shows presence when the participant is online', () => {
    mockMessages({});
    mockedUseSocketContext.mockReturnValue({ onlineUsers: { 'user-2': true } });

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    expect(screen.getByLabelText('Online')).toBeInTheDocument();
    expect(screen.getByText('Active now')).toBeInTheDocument();
  });

  it('hides presence when the participant is offline', () => {
    mockMessages({});
    mockedUseSocketContext.mockReturnValue({ onlineUsers: {} });

    render(
      <MessageThread
        conversationId="conv-1"
        participant={{ id: 'user-2', name: 'Ada', image: null }}
      />
    );

    expect(screen.queryByLabelText('Online')).not.toBeInTheDocument();
    expect(screen.queryByText('Active now')).not.toBeInTheDocument();
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
