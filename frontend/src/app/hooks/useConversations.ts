'use client';

import { useQuery } from '@tanstack/react-query';
import { getConversations } from '../utils/messageApi';

const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;

function useConversations() {
  return useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: getConversations,
  });
}

export { useConversations, CONVERSATIONS_QUERY_KEY };
