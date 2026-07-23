'use client';

import { useQuery } from '@tanstack/react-query';
import { getConversations } from '../utils/messageApi';

function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  });
}

export { useConversations };
