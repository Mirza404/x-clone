'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { getConversations } from '../utils/messageApi';

const CONVERSATIONS_QUERY_KEY = ['conversations'] as const;

function useConversations() {
  const { status } = useSession();

  return useQuery({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: getConversations,
    enabled: status === 'authenticated',
  });
}

export { useConversations, CONVERSATIONS_QUERY_KEY };
