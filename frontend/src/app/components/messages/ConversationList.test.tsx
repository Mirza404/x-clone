import { render, screen, fireEvent } from '@testing-library/react';
import ConversationList from './ConversationList';
import type { ConversationSummary } from '@/app/types/Conversation';

function makeConversation(id: string): ConversationSummary {
  return {
    id,
    participant: { id: `user-${id}`, name: `User ${id}`, image: null },
    lastMessage: null,
    lastMessageAt: new Date(0).toISOString(),
    unreadCount: 0,
  };
}

describe('ConversationList', () => {
  it('shows a loading indicator while loading', () => {
    render(
      <ConversationList
        conversations={[]}
        selectedId={null}
        onSelect={jest.fn()}
        isLoading={true}
        isError={false}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error message on failure', () => {
    render(
      <ConversationList
        conversations={[]}
        selectedId={null}
        onSelect={jest.fn()}
        isLoading={false}
        isError={true}
      />
    );

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('shows an empty state when there are no conversations', () => {
    render(
      <ConversationList
        conversations={[]}
        selectedId={null}
        onSelect={jest.fn()}
        isLoading={false}
        isError={false}
      />
    );

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('renders a row per conversation and forwards selection', () => {
    const onSelect = jest.fn();
    render(
      <ConversationList
        conversations={[makeConversation('1'), makeConversation('2')]}
        selectedId="1"
        onSelect={onSelect}
        isLoading={false}
        isError={false}
      />
    );

    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('User 2'));
    expect(onSelect).toHaveBeenCalledWith('2');
  });
});
