'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  useInfiniteQuery,
  useQueryClient,
  InfiniteData,
} from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  getConversationMessages,
  markConversationRead,
} from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import { CONVERSATIONS_QUERY_KEY } from './useConversations';
import type { Message } from '../types/Message';
import type { ConversationSummary } from '../types/Conversation';

type MessagesPage = Awaited<ReturnType<typeof getConversationMessages>>;
type MessagesData = InfiniteData<MessagesPage, number>;

const EMPTY_PAGE: MessagesPage = {
  nextPage: undefined,
  previousPage: undefined,
  messages: [],
};

const ACK_TIMEOUT_MS = 10_000;

interface MessageSendAck {
  ok: boolean;
  message?: Message;
  error?: string;
}

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

function upsertMessage(
  pages: MessagesPage[],
  message: Message,
  currentUserId: string
): MessagesPage[] {
  const alreadyPresent = pages.some((page) =>
    page.messages.some((m) => m._id === message._id)
  );
  if (alreadyPresent) {
    return pages;
  }

  const [latestPage, ...olderPages] = pages;
  const pending = latestPage?.messages.findIndex(
    (m) =>
      m.status === 'sending' &&
      m.sender === currentUserId &&
      m.content === message.content
  );

  if (latestPage && pending !== undefined && pending !== -1) {
    const messages = [...latestPage.messages];
    messages[pending] = message;
    return [{ ...latestPage, messages }, ...olderPages];
  }

  const base = latestPage ?? EMPTY_PAGE;
  return [{ ...base, messages: [...base.messages, message] }, ...olderPages];
}

function replaceMessage(
  pages: MessagesPage[],
  tempId: string,
  replacement: Message
): MessagesPage[] {
  return pages.map((page) => ({
    ...page,
    messages: page.messages.map((m) => (m._id === tempId ? replacement : m)),
  }));
}

function markFailed(pages: MessagesPage[], tempId: string): MessagesPage[] {
  return pages.map((page) => ({
    ...page,
    messages: page.messages.map((m) =>
      m._id === tempId ? { ...m, status: 'failed' as const } : m
    ),
  }));
}

function useMessages(conversationId: string | null) {
  const { emit, subscribe, connected } = useSocketContext();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const currentUserId = session?.user?.id ?? '';
  const queryKey = useMemo(
    () => ['messages', conversationId] as const,
    [conversationId]
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      getConversationMessages(conversationId as string, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: Boolean(conversationId),
  });

  const markAsRead = useCallback(
    (id: string) => {
      if (connected) {
        emit('message:read', { conversationId: id });
      } else {
        void markConversationRead(id);
      }

      queryClient.setQueryData<ConversationSummary[]>(
        CONVERSATIONS_QUERY_KEY,
        (current) =>
          current?.map((conversation) =>
            conversation.id === id
              ? { ...conversation, unreadCount: 0 }
              : conversation
          )
      );
    },
    [connected, emit, queryClient]
  );

  useEffect(() => {
    if (!conversationId || !query.isSuccess) {
      return;
    }
    markAsRead(conversationId);
  }, [conversationId, query.isSuccess, markAsRead]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    return subscribe('message:new', (raw: unknown) => {
      if (
        !isNewMessageEvent(raw) ||
        raw.message.conversation !== conversationId
      ) {
        return;
      }

      queryClient.setQueryData<MessagesData>(queryKey, (current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          pages: upsertMessage(current.pages, raw.message, currentUserId),
        };
      });

      if (raw.message.sender !== currentUserId) {
        markAsRead(conversationId);
      }
    });
  }, [
    conversationId,
    subscribe,
    queryClient,
    currentUserId,
    queryKey,
    markAsRead,
  ]);

  const messages = (query.data?.pages ?? [])
    .slice()
    .reverse()
    .flatMap((page) => page.messages);

  const sendMessage = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!conversationId || !trimmed) {
        return;
      }

      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: Message = {
        _id: tempId,
        conversation: conversationId,
        sender: currentUserId,
        content: trimmed,
        readBy: [],
        deliveredTo: [],
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      queryClient.setQueryData<MessagesData>(queryKey, (current) => {
        if (!current) {
          return {
            pages: [{ ...EMPTY_PAGE, messages: [optimisticMessage] }],
            pageParams: [1],
          };
        }
        const [latestPage, ...olderPages] = current.pages;
        const base = latestPage ?? EMPTY_PAGE;
        return {
          ...current,
          pages: [
            { ...base, messages: [...base.messages, optimisticMessage] },
            ...olderPages,
          ],
        };
      });

      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        queryClient.setQueryData<MessagesData>(queryKey, (current) =>
          current
            ? { ...current, pages: markFailed(current.pages, tempId) }
            : current
        );
      }, ACK_TIMEOUT_MS);

      emit<{ conversationId: string; content: string }, MessageSendAck>(
        'message:send',
        { conversationId, content: trimmed },
        (ack) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);

          queryClient.setQueryData<MessagesData>(queryKey, (current) => {
            if (!current) {
              return current;
            }
            const pages =
              ack.ok && ack.message
                ? replaceMessage(current.pages, tempId, ack.message)
                : markFailed(current.pages, tempId);
            return { ...current, pages };
          });
        }
      );
    },
    [conversationId, currentUserId, emit, queryClient, queryKey]
  );

  return { ...query, messages, sendMessage };
}

export { useMessages };
