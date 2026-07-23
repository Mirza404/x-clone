import LoadCircle from '../ui/LoadCircle';
import EmptyState from '../ui/EmptyState';
import ConversationListItem from './ConversationListItem';
import type { ConversationSummary } from '@/app/types/Conversation';

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  isError: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  isError,
}: ConversationListProps) {
  if (isLoading) {
    return <LoadCircle />;
  }

  if (isError) {
    return (
      <div className="p-4 text-center text-muted">Something went wrong.</div>
    );
  }

  if (conversations.length === 0) {
    return (
      <EmptyState
        title="No messages yet"
        subtitle="When you get direct messages, they'll show up here."
      />
    );
  }

  return (
    <div>
      {conversations.map((conversation) => (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          isActive={conversation.id === selectedId}
          onSelect={() => onSelect(conversation.id)}
        />
      ))}
    </div>
  );
}
