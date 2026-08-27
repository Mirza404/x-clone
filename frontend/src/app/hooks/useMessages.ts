'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  getConversationMessages,
  markConversationRead,
  sendMessageRest,
} from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import { CONVERSATIONS_QUERY_KEY } from './useConversations';
import {
  EMPTY_PAGE,
  replaceMessage,
  markFailed,
  markSending,
  type MessagesData,
} from './messagesCacheUtils';
import type { Message } from '../types/Message';
import type { ConversationSummary } from '../types/Conversation';

const ACK_TIMEOUT_MS = 10_000;

interface MessageSendAck {
  ok: boolean;
  message?: Message;
  error?: string;
}

interface MessageReadAck {
  ok: boolean;
  error?: string;
}

function useMessages(conversationId: string | null) {
  const { emit, connected } = useSocketContext();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const currentUserId = session?.user?.id ?? '';
  const queryKey = useMemo(
    () => ['messages', conversationId] as const,
    [conversationId]
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      getConversationMessages(conversationId as string, pageParam),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: Boolean(conversationId),
  });

  // `message:new`/`message:read` are applied to this cache exclusively by
  // `useSocketCacheSync` (mounted once at the root), not by this hook — see
  // that module for why. `messages` below is therefore a plain read of
  // whatever the query cache currently holds, live-updated socket writes
  // included.
  const messages = (query.data?.pages ?? [])
    .slice()
    .reverse()
    .flatMap((page) => page.messages);

  const confirmRead = useCallback(
    (id: string) => {
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
    [queryClient]
  );

  const reconcileReadFailure = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: CONVERSATIONS_QUERY_KEY,
    });
  }, [queryClient]);

  const markAsRead = useCallback(
    (id: string) => {
      const fallBackToRest = async () => {
        if (await markConversationRead(id)) {
          confirmRead(id);
          return;
        }
        await reconcileReadFailure();
      };

      if (!connected) {
        void fallBackToRest();
        return;
      }

      let socketSettled = false;
      let fallbackStarted = false;
      const startFallback = () => {
        if (fallbackStarted) {
          return;
        }
        fallbackStarted = true;
        void fallBackToRest();
      };
      const timeout = setTimeout(() => {
        socketSettled = true;
        startFallback();
      }, ACK_TIMEOUT_MS);

      emit<{ conversationId: string }, MessageReadAck>(
        'message:read',
        { conversationId: id },
        (ack) => {
          if (socketSettled) {
            return;
          }
          socketSettled = true;
          clearTimeout(timeout);
          if (ack.ok) {
            confirmRead(id);
            return;
          }
          startFallback();
        }
      );
    },
    [confirmRead, connected, emit, reconcileReadFailure]
  );

  // Marks the thread read once on initial load, and again whenever the
  // cached last message changes to a new message from the other user (a
  // live `message:new` write from `useSocketCacheSync` while this thread is
  // open). Deriving this from the cache instead of subscribing to the socket
  // directly means this hook doesn't need its own `message:new` listener.
  const lastHandledRef = useRef<{
    conversationId: string;
    messageId: string | null;
  } | null>(null);

  useEffect(() => {
    if (!conversationId || !query.isSuccess) {
      return;
    }

    const last = messages[messages.length - 1];
    const lastId = last?._id ?? null;
    const previous = lastHandledRef.current;
    const isNewConversation =
      !previous || previous.conversationId !== conversationId;

    if (isNewConversation) {
      lastHandledRef.current = { conversationId, messageId: lastId };
      markAsRead(conversationId);
      return;
    }

    if (previous.messageId === lastId) {
      return;
    }
    lastHandledRef.current = { conversationId, messageId: lastId };
    if (last && last.sender !== currentUserId) {
      markAsRead(conversationId);
    }
  }, [conversationId, query.isSuccess, messages, currentUserId, markAsRead]);

  // Prefer the socket while connected, then use the idempotent REST endpoint
  // if the socket is unavailable or its acknowledgement times out. Both paths
  // reuse the same clientId, so an uncertain socket result cannot create a
  // duplicate. A message becomes retryable only after the available path has
  // failed.
  const attemptSend = useCallback(
    (message: Message) => {
      const clientId = message.clientId;
      if (!clientId) {
        queryClient.setQueryData<MessagesData>(queryKey, (current) =>
          current
            ? { ...current, pages: markFailed(current.pages, message._id) }
            : current
        );
        return;
      }

      const finalizeWithRest = async () => {
        const sent = await sendMessageRest(
          message.conversation,
          message.content,
          message.images,
          clientId
        );
        queryClient.setQueryData<MessagesData>(queryKey, (current) => {
          if (!current) {
            return current;
          }
          const pages = sent
            ? replaceMessage(current.pages, message._id, sent)
            : markFailed(current.pages, message._id);
          return { ...current, pages };
        });
      };

      if (!connected) {
        void finalizeWithRest();
        return;
      }

      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        void finalizeWithRest();
      }, ACK_TIMEOUT_MS);

      emit<
        {
          conversationId: string;
          content: string;
          images: string[];
          clientId: string;
        },
        MessageSendAck
      >(
        'message:send',
        {
          conversationId: message.conversation,
          content: message.content,
          images: message.images,
          clientId,
        },
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
                ? replaceMessage(current.pages, message._id, ack.message)
                : markFailed(current.pages, message._id);
            return { ...current, pages };
          });
        }
      );
    },
    [connected, emit, queryClient, queryKey]
  );

  const sendMessage = useCallback(
    (content: string, images: string[] = []) => {
      const trimmed = content.trim();
      if (!conversationId || !trimmed) {
        return;
      }

      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const optimisticMessage: Message = {
        _id: tempId,
        conversation: conversationId,
        sender: currentUserId,
        clientId,
        content: trimmed,
        images,
        readBy: [],
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      queryClient.setQueryData<MessagesData>(queryKey, (current) => {
        if (!current) {
          return {
            pages: [{ ...EMPTY_PAGE, messages: [optimisticMessage] }],
            pageParams: [null],
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

      attemptSend(optimisticMessage);
    },
    [conversationId, currentUserId, queryClient, queryKey, attemptSend]
  );

  // Manual retry for a message already marked 'failed'. Reuses the original
  // clientId so a retry after a send that actually succeeded server-side
  // (e.g. a buffered emit that landed late) resolves to the same message
  // instead of creating a duplicate.
  const retryMessage = useCallback(
    (tempId: string) => {
      const current = queryClient.getQueryData<MessagesData>(queryKey);
      const failedMessage = current?.pages
        .flatMap((page) => page.messages)
        .find((m) => m._id === tempId && m.status === 'failed');

      if (!failedMessage || !failedMessage.clientId) {
        return;
      }

      queryClient.setQueryData<MessagesData>(queryKey, (data) =>
        data ? { ...data, pages: markSending(data.pages, tempId) } : data
      );

      attemptSend({ ...failedMessage, status: 'sending' });
    },
    [queryClient, queryKey, attemptSend]
  );

  return { ...query, messages, sendMessage, retryMessage };
}

export { useMessages };
