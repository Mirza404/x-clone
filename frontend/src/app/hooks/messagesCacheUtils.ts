import type { InfiniteData } from '@tanstack/react-query';
import type { getConversationMessages } from '../utils/messageApi';
import type { Message } from '../types/Message';

/**
 * Pure helpers for reading and writing the `['messages', conversationId]`
 * infinite-query cache. Kept free of React Query/socket wiring so both
 * `useMessages` (command flows: send, retry) and `useSocketCacheSync`
 * (the sole socket-event writer for this cache) share one implementation
 * instead of each re-deriving page-shape logic.
 */

export type MessagesPage = Awaited<ReturnType<typeof getConversationMessages>>;
export type MessagesData = InfiniteData<MessagesPage, string | null>;

export const EMPTY_PAGE: MessagesPage = {
  nextPage: undefined,
  messages: [],
};

export function messagesQueryKey(conversationId: string) {
  return ['messages', conversationId] as const;
}

export function upsertMessage(
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
      (m.status === 'sending' || m.status === 'failed') &&
      m.sender === currentUserId &&
      m.clientId === message.clientId
  );

  if (latestPage && pending !== undefined && pending !== -1) {
    const messages = [...latestPage.messages];
    messages[pending] = message;
    return [{ ...latestPage, messages }, ...olderPages];
  }

  const base = latestPage ?? EMPTY_PAGE;
  return [{ ...base, messages: [...base.messages, message] }, ...olderPages];
}

export function markAllRead(
  pages: MessagesPage[],
  readerId: string
): MessagesPage[] {
  return pages.map((page) => ({
    ...page,
    messages: page.messages.map((m) =>
      m.readBy.includes(readerId)
        ? m
        : { ...m, readBy: [...m.readBy, readerId] }
    ),
  }));
}

export function replaceMessage(
  pages: MessagesPage[],
  tempId: string,
  replacement: Message
): MessagesPage[] {
  return pages.map((page) => ({
    ...page,
    messages: page.messages.map((m) => (m._id === tempId ? replacement : m)),
  }));
}

export function markFailed(
  pages: MessagesPage[],
  tempId: string
): MessagesPage[] {
  return pages.map((page) => ({
    ...page,
    messages: page.messages.map((m) =>
      m._id === tempId ? { ...m, status: 'failed' as const } : m
    ),
  }));
}

export function markSending(
  pages: MessagesPage[],
  tempId: string
): MessagesPage[] {
  return pages.map((page) => ({
    ...page,
    messages: page.messages.map((m) =>
      m._id === tempId ? { ...m, status: 'sending' as const } : m
    ),
  }));
}
