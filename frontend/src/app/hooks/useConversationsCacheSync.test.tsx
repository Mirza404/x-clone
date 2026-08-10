import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useSocketContext } from '../utils/SocketProvider';
import {
  useConversationsCacheSync,
  applyNewMessage,
} from './useConversationsCacheSync';
import { CONVERSATIONS_QUERY_KEY } from './useConversations';
import type { ConversationSummary } from '../types/Conversation';
import type { Message } from '../types/Message';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../utils/SocketProvider', () => ({
  useSocketContext: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUseSocketContext = useSocketContext as jest.Mock;

function makeConversation(
  overrides: Partial<ConversationSummary> = {}
): ConversationSummary {
  return {
    id: 'conv-1',
    participant: { id: 'user-2', name: 'Ada', image: null },
    lastMessage: null,
    lastMessageAt: new Date(0).toISOString(),
    unreadCount: 0,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    _id: 'm1',
    conversation: 'conv-1',
    sender: 'user-2',
    content: 'hello',
    images: [],
    readBy: [],
    deliveredTo: [],
    createdAt: new Date(1).toISOString(),
    ...overrides,
  };
}

describe('applyNewMessage', () => {
  it('bumps unreadCount for a message from the other participant', () => {
    const { updated, found } = applyNewMessage(
      [makeConversation({ unreadCount: 1 })],
      makeMessage({ sender: 'user-2', content: 'new one' }),
      'me'
    );

    expect(found).toBe(true);
    expect(updated[0].unreadCount).toBe(2);
    expect(updated[0].lastMessage?.content).toBe('new one');
  });

  it('does not bump unreadCount for a message the current user sent', () => {
    const { updated } = applyNewMessage(
      [makeConversation({ unreadCount: 0 })],
      makeMessage({ sender: 'me' }),
      'me'
    );

    expect(updated[0].unreadCount).toBe(0);
  });

  it('moves the updated conversation to the front', () => {
    const older = makeConversation({ id: 'conv-1' });
    const newer = makeConversation({ id: 'conv-2' });

    const { updated } = applyNewMessage(
      [newer, older],
      makeMessage({ conversation: 'conv-1' }),
      'me'
    );

    expect(updated.map((c) => c.id)).toEqual(['conv-1', 'conv-2']);
  });

  it('reports not found for a conversation not in the cache', () => {
    const { found } = applyNewMessage(
      [makeConversation({ id: 'conv-1' })],
      makeMessage({ conversation: 'conv-2' }),
      'me'
    );

    expect(found).toBe(false);
  });
});

describe('useConversationsCacheSync', () => {
  let handlers: Map<string, (payload: unknown) => void>;
  let subscribeCalls: string[];

  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'me' } },
    });
    handlers = new Map();
    subscribeCalls = [];
    mockedUseSocketContext.mockReturnValue({
      subscribe: jest.fn((event: string, handler: (p: unknown) => void) => {
        subscribeCalls.push(event);
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function renderWithClient(queryClient: QueryClient) {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return renderHook(() => useConversationsCacheSync(), { wrapper });
  }

  it('subscribes exactly once and applies a message:new event to the cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, [
      makeConversation({ unreadCount: 1 }),
    ]);

    renderWithClient(queryClient);

    await waitFor(() => expect(subscribeCalls).toEqual(['message:new']));

    act(() => {
      handlers.get('message:new')?.({
        message: makeMessage({ sender: 'user-2' }),
      });
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<ConversationSummary[]>(
        CONVERSATIONS_QUERY_KEY
      );
      expect(data?.[0].unreadCount).toBe(2);
    });
  });

  it('refetches when message:new references a conversation not yet in the cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, [
      makeConversation({ id: 'conv-1' }),
    ]);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    renderWithClient(queryClient);

    act(() => {
      handlers.get('message:new')?.({
        message: makeMessage({ conversation: 'conv-2' }),
      });
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: CONVERSATIONS_QUERY_KEY,
      })
    );
  });
});
