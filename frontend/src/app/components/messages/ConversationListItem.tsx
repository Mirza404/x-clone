import Avatar from '../ui/Avatar';
import { relativeTime } from '@/app/utils/relativeTime';
import { toHandle } from '@/app/utils/handle';
import type { ConversationSummary } from '@/app/types/Conversation';

interface ConversationListItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: () => void;
}

export default function ConversationListItem({
  conversation,
  isActive,
  onSelect,
}: ConversationListItemProps) {
  const { participant, lastMessage, lastMessageAt, unreadCount } = conversation;
  const name = participant?.name ?? 'Unknown user';
  const hasUnread = unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors hover:bg-hover ${
        isActive ? 'bg-hover' : ''
      }`}
    >
      <Avatar src={participant?.image} alt={`${name}'s profile`} size="lg" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 text-[15px]">
          <span className="truncate font-bold text-content">{name}</span>
          {participant?.name && (
            <span className="truncate text-muted">
              {toHandle(participant.name)}
            </span>
          )}
          <span aria-hidden="true" className="text-muted">
            ·
          </span>
          <span className="flex-shrink-0 text-muted">
            {relativeTime(lastMessageAt)}
          </span>
        </div>
        <p
          className={`truncate text-[15px] ${
            hasUnread ? 'font-bold text-content' : 'text-muted'
          }`}
        >
          {lastMessage?.content ?? 'No messages yet'}
        </p>
      </div>
      {hasUnread && (
        <span
          aria-label={`${unreadCount} unread`}
          className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
