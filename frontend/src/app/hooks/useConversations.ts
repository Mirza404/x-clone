'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { getConversations } from '../utils/messageApi';

const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;

// `message:new` cache updates (bump unread/lastMessage, reorder by recency)
// are applied once for the whole app by `useConversationsCacheSync`, mounted
// from `SocketProvider` — not here, since this hook is called from multiple
// mounted surfaces at once.
function useConversations() {
  const { status } = useSession();

  return useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: getConversations,
    enabled: status === 'authenticated',
  });
}

export { useConversations, CONVERSATIONS_QUERY_KEY };
