'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useSocketContext } from '../utils/SocketProvider';
import { CONVERSATIONS_QUERY_KEY } from './useConversations';
import type { ConversationSummary } from '../types/Conversation';
import type { Message } from '../types/Message';

interface NewMessageEvent {
  message: Message;
}

function isNewMessageEvent(value: unknown): value is NewMessageEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { message?: unknown }).message === 'object'
  );
}

function applyNewMessage(
  conversations: ConversationSummary[],
  message: Message,
  currentUserId: string
): { updated: ConversationSummary[]; found: boolean } {
  const index = conversations.findIndex(
    (conversation) => conversation.id === message.conversation
  );

  if (index === -1) {
    return { updated: conversations, found: false };
  }

  const current = conversations[index];
  const next: ConversationSummary = {
    ...current,
    lastMessage: message,
    lastMessageAt: message.createdAt,
    unreadCount:
      message.sender === currentUserId
        ? current.unreadCount
        : current.unreadCount + 1,
  };

  const updated = conversations.filter((_, i) => i !== index);
  updated.unshift(next);

  return { updated, found: true };
}

// Installed once from SocketProvider, at the root of the tree. `useConversations`
// is called from multiple mounted surfaces at once (messages page, mobile nav,
// floating message UI); a listener registered per hook instance would apply the
// same `message:new` event once per mounted instance, double- (or triple-)
// counting unread messages. A single subscription here keeps the cache mutation
// exactly-once regardless of how many consumers are mounted.
function useConversationsCacheSync(): void {
  const { status, data: session } = useSession();
  const queryClient = useQueryClient();
  const { subscribe } = useSocketContext();
  const currentUserId = session?.user?.id ?? '';

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    return subscribe('message:new', (raw: unknown) => {
      if (!isNewMessageEvent(raw)) {
        return;
      }

      let found = false;

      queryClient.setQueryData<ConversationSummary[]>(
        CONVERSATIONS_QUERY_KEY,
        (current) => {
          if (!current) {
            return current;
          }
          const result = applyNewMessage(current, raw.message, currentUserId);
          found = result.found;
          return result.updated;
        }
      );

      if (!found) {
        queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      }
    });
  }, [status, subscribe, queryClient, currentUserId]);
}

export { useConversationsCacheSync, applyNewMessage };
