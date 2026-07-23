import type { Message } from './Message';

export interface ConversationParticipant {
  id: string;
  name: string | null;
  image: string | null;
}

export interface ConversationSummary {
  id: string;
  participant: ConversationParticipant | null;
  lastMessage: Message | null;
  lastMessageAt: string;
  unreadCount: number;
}
