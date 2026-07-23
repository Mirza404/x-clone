import { render, screen, fireEvent } from '@testing-library/react';
import ConversationListItem from './ConversationListItem';
import { useSocketContext } from '@/app/utils/SocketProvider';
import type { ConversationSummary } from '@/app/types/Conversation';

jest.mock('@/app/utils/SocketProvider', () => ({
  useSocketContext: jest.fn(),
}));

const mockedUseSocketContext = useSocketContext as jest.Mock;

function makeConversation(
  overrides: Partial<ConversationSummary> = {}
): ConversationSummary {
  return {
    id: 'conv-1',
    participant: { id: 'user-2', name: 'Ada Lovelace', image: null },
    lastMessage: null,
    lastMessageAt: new Date(0).toISOString(),
    unreadCount: 0,
    ...overrides,
  };
}

describe('ConversationListItem', () => {
  beforeEach(() => {
    mockedUseSocketContext.mockReturnValue({ onlineUsers: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the participant name and last message preview', () => {
    render(
      <ConversationListItem
        conversation={makeConversation({
          lastMessage: {
            _id: 'm1',
            conversation: 'conv-1',
            sender: 'user-2',
            content: 'hey there',
            readBy: [],
            deliveredTo: [],
            createdAt: new Date(0).toISOString(),
          },
        })}
        isActive={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('hey there')).toBeInTheDocument();
  });

  it('shows a fallback when there are no messages yet', () => {
    render(
      <ConversationListItem
        conversation={makeConversation()}
        isActive={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('shows the unread count badge when there are unread messages', () => {
    render(
      <ConversationListItem
        conversation={makeConversation({ unreadCount: 3 })}
        isActive={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByLabelText('3 unread')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(
      <ConversationListItem
        conversation={makeConversation()}
        isActive={false}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows a presence dot when the participant is online', () => {
    mockedUseSocketContext.mockReturnValue({ onlineUsers: { 'user-2': true } });

    render(
      <ConversationListItem
        conversation={makeConversation()}
        isActive={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Online')).toBeInTheDocument();
  });

  it('hides the presence dot when the participant is offline', () => {
    mockedUseSocketContext.mockReturnValue({ onlineUsers: {} });

    render(
      <ConversationListItem
        conversation={makeConversation()}
        isActive={false}
        onSelect={jest.fn()}
      />
    );

    expect(screen.queryByLabelText('Online')).not.toBeInTheDocument();
  });
});
