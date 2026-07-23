'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { getConversations } from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import type { ConversationSummary } from '../types/Conversation';
import type { Message } from '../types/Message';

const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;
const QUERY_KEY = CONVERSATIONS_QUERY_KEY;

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
  let found = false;

  const updated = conversations.map((conversation) => {
    if (conversation.id !== message.conversation) {
      return conversation;
    }
    found = true;
    return {
      ...conversation,
      lastMessage: message,
      lastMessageAt: message.createdAt,
      unreadCount:
        message.sender === currentUserId
          ? conversation.unreadCount
          : conversation.unreadCount + 1,
    };
  });

  return { updated, found };
}

function useConversations() {
  const { status, data: session } = useSession();
  const queryClient = useQueryClient();
  const { subscribe } = useSocketContext();
  const currentUserId = session?.user?.id ?? '';

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: getConversations,
    enabled: status === 'authenticated',
  });

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    return subscribe('message:new', (raw: unknown) => {
      if (!isNewMessageEvent(raw)) {
        return;
      }

      let found = false;

      queryClient.setQueryData<ConversationSummary[]>(QUERY_KEY, (current) => {
        if (!current) {
          return current;
        }
        const result = applyNewMessage(current, raw.message, currentUserId);
        found = result.found;
        return result.updated;
      });

      if (!found) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    });
  }, [status, subscribe, queryClient, currentUserId]);

  return query;
}

export { useConversations, CONVERSATIONS_QUERY_KEY };
