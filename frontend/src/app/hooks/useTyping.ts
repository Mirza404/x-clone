'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useSession } from 'next-auth/react';
import { useSocketContext } from '../utils/SocketProvider';

const STOP_DELAY_MS = 2000;
const PEER_TYPING_TIMEOUT_MS = 5000;

interface TypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

function isTypingEvent(value: unknown): value is TypingEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { conversationId?: unknown }).conversationId ===
      'string' &&
    typeof (value as { userId?: unknown }).userId === 'string' &&
    typeof (value as { isTyping?: unknown }).isTyping === 'boolean'
  );
}

function useTyping(conversationId: string | null) {
  const { emit, subscribe } = useSocketContext();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const isTypingRef = useRef(false);
  const clearPeerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = useDebouncedCallback(() => {
    if (!conversationId || !isTypingRef.current) {
      return;
    }
    isTypingRef.current = false;
    emit('typing:stop', { conversationId });
  }, STOP_DELAY_MS);

  const notifyTyping = useCallback(() => {
    if (!conversationId) {
      return;
    }
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emit('typing:start', { conversationId });
    }
    stopTyping();
  }, [conversationId, emit, stopTyping]);

  const stopTypingNow = useCallback(() => {
    stopTyping.cancel();
    if (conversationId && isTypingRef.current) {
      isTypingRef.current = false;
      emit('typing:stop', { conversationId });
    }
  }, [conversationId, emit, stopTyping]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    return subscribe('typing', (raw: unknown) => {
      if (
        !isTypingEvent(raw) ||
        raw.conversationId !== conversationId ||
        raw.userId === currentUserId
      ) {
        return;
      }

      if (clearPeerTimer.current) {
        clearTimeout(clearPeerTimer.current);
        clearPeerTimer.current = null;
      }

      setIsPeerTyping(raw.isTyping);
      if (raw.isTyping) {
        clearPeerTimer.current = setTimeout(() => {
          setIsPeerTyping(false);
        }, PEER_TYPING_TIMEOUT_MS);
      }
    });
  }, [conversationId, subscribe, currentUserId]);

  useEffect(() => {
    isTypingRef.current = false;
  }, [conversationId]);

  const [trackedConversationId, setTrackedConversationId] =
    useState(conversationId);
  if (conversationId !== trackedConversationId) {
    setTrackedConversationId(conversationId);
    setIsPeerTyping(false);
  }

  return { isPeerTyping, notifyTyping, stopTypingNow };
}

export { useTyping };
