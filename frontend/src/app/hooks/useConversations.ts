'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { getConversations } from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import type { ConversationSummary } from '../types/Conversation';
import type { Message } from '../types/Message';

const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;
const MESSAGES_QUERY_KEY = ['messages'] as const;
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

  updated.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  return { updated, found };
}

function useConversations() {
  const { status } = useSession();

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getConversations,
    enabled: status === 'authenticated',
  });
}

/**
 * Applies incoming `message:new` events to the conversations cache. Must be
 * mounted exactly once (in SocketProvider) — mounting it per-consumer would
 * process each event once per mounted consumer and inflate unreadCount.
 */
function useConversationsCacheBridge(): void {
  const { status, data: session } = useSession();
  const queryClient = useQueryClient();
  const { subscribe, connected } = useSocketContext();
  const currentUserId = session?.user?.id ?? '';
  const wasConnected = useRef(connected);

  useEffect(() => {
    if (status === 'authenticated' && connected && !wasConnected.current) {
      void queryClient.invalidateQueries({
        queryKey: CONVERSATIONS_QUERY_KEY,
      });
      void queryClient.invalidateQueries({ queryKey: MESSAGES_QUERY_KEY });
    }
    wasConnected.current = connected;
  }, [status, connected, queryClient]);

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
}

export {
  useConversations,
  useConversationsCacheBridge,
  CONVERSATIONS_QUERY_KEY,
};
