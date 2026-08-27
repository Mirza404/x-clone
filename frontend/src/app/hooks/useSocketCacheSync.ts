'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useSocketContext } from '../utils/SocketProvider';
import { CONVERSATIONS_QUERY_KEY } from './useConversations';
import {
  upsertMessage,
  markAllRead,
  type MessagesData,
} from './messagesCacheUtils';
import type { ConversationSummary } from '../types/Conversation';
import type { Message } from '../types/Message';

const MESSAGES_QUERY_KEY = ['messages'] as const;

interface NewMessageEvent {
  message: Message;
}

interface MessageReadEvent {
  conversationId: string;
  userId: string;
}

function isNewMessageEvent(value: unknown): value is NewMessageEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { message?: unknown }).message === 'object'
  );
}

function isMessageReadEvent(value: unknown): value is MessageReadEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { conversationId?: unknown }).conversationId ===
      'string' &&
    typeof (value as { userId?: unknown }).userId === 'string'
  );
}

function applyNewMessageToConversations(
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

/**
 * The single owner of messaging-related socket event subscriptions and the
 * query-cache mutations they trigger. Must be mounted exactly once (via
 * `SocketCacheSync` in the root layout) — mounting it per-consumer would
 * process each event once per mount and duplicate cache updates (e.g.
 * inflate unreadCount, double-append a message).
 *
 * Owns:
 * - `message:new`: updates the conversations list cache (preview, unread
 *   count, ordering) and the `['messages', conversationId]` cache for the
 *   matching conversation, whether or not a thread for it is currently
 *   mounted.
 * - `message:read`: marks messages read in the matching conversation's
 *   `['messages', conversationId]` cache.
 * - reconnect: invalidates both the inbox and all message-history queries so
 *   React Query refetches active views from durable REST state, recovering
 *   events missed while disconnected.
 *
 * Typing (`useTyping`) and presence (`useSocket`, via `SocketProvider`)
 * intentionally stay out of this hook: they already have exactly one
 * subscription site each and hold transient UI state rather than
 * query-cache data, so folding them in here would not remove any
 * duplication.
 */
function useSocketCacheSync(): void {
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
      const { message } = raw;

      let found = false;
      queryClient.setQueryData<ConversationSummary[]>(
        CONVERSATIONS_QUERY_KEY,
        (current) => {
          if (!current) {
            return current;
          }
          const result = applyNewMessageToConversations(
            current,
            message,
            currentUserId
          );
          found = result.found;
          return result.updated;
        }
      );
      if (!found) {
        queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      }

      queryClient.setQueriesData<MessagesData>(
        { queryKey: ['messages', message.conversation] },
        (current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            pages: upsertMessage(current.pages, message, currentUserId),
          };
        }
      );
    });
  }, [status, subscribe, queryClient, currentUserId]);

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }

    return subscribe('message:read', (raw: unknown) => {
      if (!isMessageReadEvent(raw)) {
        return;
      }

      queryClient.setQueriesData<MessagesData>(
        { queryKey: ['messages', raw.conversationId] },
        (current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            pages: markAllRead(current.pages, raw.userId),
          };
        }
      );
    });
  }, [status, subscribe, queryClient]);
}

export { useSocketCacheSync };
