import { render, screen, fireEvent } from '@testing-library/react';
import ConversationListItem from './ConversationListItem';
import type { ConversationSummary } from '@/app/types/Conversation';

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
});
