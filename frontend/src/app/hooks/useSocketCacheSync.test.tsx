import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { getConversations } from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import { useConversations, CONVERSATIONS_QUERY_KEY } from './useConversations';
import { useSocketCacheSync } from './useSocketCacheSync';
import { EMPTY_PAGE, type MessagesData } from './messagesCacheUtils';
import type { ConversationSummary } from '../types/Conversation';
import type { Message } from '../types/Message';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../utils/messageApi', () => ({
  getConversations: jest.fn(),
}));

jest.mock('../utils/SocketProvider', () => ({
  useSocketContext: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedGetConversations = getConversations as jest.Mock;
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
    createdAt: new Date(1).toISOString(),
    ...overrides,
  };
}

function makeWrapper(queryClient: QueryClient) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

// Mounts the sync hook (once, as SocketCacheSync does in the root layout)
// plus one or more useConversations() consumers sharing a client.
function mountSyncAndConsumers(
  consumerCount: number,
  queryClient: QueryClient
) {
  const wrapper = makeWrapper(queryClient);

  renderHook(() => useSocketCacheSync(), { wrapper });
  const views = Array.from({ length: consumerCount }, () =>
    renderHook(() => useConversations(), { wrapper })
  );

  return views;
}

describe('useSocketCacheSync', () => {
  let handlers: Map<string, (payload: unknown) => void>;
  let connected: boolean;

  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'me' } },
    });
    handlers = new Map();
    connected = true;
    mockedUseSocketContext.mockImplementation(() => ({
      connected,
      subscribe: jest.fn((event: string, handler: (p: unknown) => void) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('message:new -> conversations cache', () => {
    it('bumps unreadCount and lastMessage for an incoming message', async () => {
      mockedGetConversations.mockResolvedValueOnce([
        makeConversation({ unreadCount: 1 }),
      ]);

      const [{ result }] = mountSyncAndConsumers(1, makeQueryClient());
      await waitFor(() => expect(result.current.data).toHaveLength(1));

      act(() => {
        handlers.get('message:new')?.({
          message: makeMessage({ sender: 'user-2', content: 'new one' }),
        });
      });

      await waitFor(() => expect(result.current.data?.[0].unreadCount).toBe(2));
      expect(result.current.data?.[0].lastMessage?.content).toBe('new one');
    });

    it('does not bump unreadCount for a message the current user sent', async () => {
      mockedGetConversations.mockResolvedValueOnce([
        makeConversation({ unreadCount: 0 }),
      ]);

      const [{ result }] = mountSyncAndConsumers(1, makeQueryClient());
      await waitFor(() => expect(result.current.data).toHaveLength(1));

      act(() => {
        handlers.get('message:new')?.({
          message: makeMessage({ sender: 'me' }),
        });
      });

      await waitFor(() =>
        expect(result.current.data?.[0].lastMessage).not.toBeNull()
      );
      expect(result.current.data?.[0].unreadCount).toBe(0);
    });

    it('moves the updated conversation into lastMessageAt order', async () => {
      mockedGetConversations.mockResolvedValueOnce([
        makeConversation({
          id: 'conv-2',
          lastMessageAt: new Date(20).toISOString(),
        }),
        makeConversation({
          id: 'conv-1',
          lastMessageAt: new Date(10).toISOString(),
        }),
      ]);

      const [{ result }] = mountSyncAndConsumers(1, makeQueryClient());
      await waitFor(() => expect(result.current.data).toHaveLength(2));

      act(() => {
        handlers.get('message:new')?.({
          message: makeMessage({ createdAt: new Date(30).toISOString() }),
        });
      });

      await waitFor(() => expect(result.current.data?.[0].id).toBe('conv-1'));
      expect(
        result.current.data?.map((conversation) => conversation.id)
      ).toEqual(['conv-1', 'conv-2']);
    });

    it('refetches when message:new references a conversation not yet in the cache', async () => {
      mockedGetConversations
        .mockResolvedValueOnce([makeConversation({ id: 'conv-1' })])
        .mockResolvedValueOnce([
          makeConversation({ id: 'conv-1' }),
          makeConversation({ id: 'conv-2' }),
        ]);

      const [{ result }] = mountSyncAndConsumers(1, makeQueryClient());
      await waitFor(() => expect(result.current.data).toHaveLength(1));

      act(() => {
        handlers.get('message:new')?.({
          message: makeMessage({ conversation: 'conv-2' }),
        });
      });

      await waitFor(() => expect(result.current.data).toHaveLength(2));
      expect(mockedGetConversations).toHaveBeenCalledTimes(2);
    });

    it('increments unreadCount only once when multiple UI surfaces mount useConversations', async () => {
      mockedGetConversations.mockResolvedValue([
        makeConversation({ unreadCount: 0 }),
      ]);

      // Simulates the messages page, mobile nav, and floating message UI all
      // mounting useConversations() at once, while only one sync hook is
      // mounted (as the root layout guarantees).
      const views = mountSyncAndConsumers(3, makeQueryClient());
      await Promise.all(
        views.map(({ result }) =>
          waitFor(() => expect(result.current.data).toHaveLength(1))
        )
      );

      // Only one handler should have been registered for message:new despite
      // three mounted consumers.
      expect(handlers.size).toBe(2); // message:new + message:read

      act(() => {
        handlers.get('message:new')?.({
          message: makeMessage({ sender: 'user-2' }),
        });
      });

      await waitFor(() =>
        expect(views[0].result.current.data?.[0].unreadCount).toBe(1)
      );
      for (const { result } of views) {
        expect(result.current.data?.[0].unreadCount).toBe(1);
      }
    });

    it('keeps the remaining consumer in sync after one of several consumers unmounts', async () => {
      mockedGetConversations.mockResolvedValue([
        makeConversation({ unreadCount: 0 }),
      ]);

      const [first, second] = mountSyncAndConsumers(2, makeQueryClient());
      await Promise.all(
        [first, second].map(({ result }) =>
          waitFor(() => expect(result.current.data).toHaveLength(1))
        )
      );

      first.unmount();

      // The sync hook itself must still own the subscriptions; an unrelated
      // consumer unmounting must not tear down the shared subscriptions or
      // register duplicates.
      expect(handlers.size).toBe(2);

      act(() => {
        handlers.get('message:new')?.({
          message: makeMessage({ sender: 'user-2' }),
        });
      });

      await waitFor(() =>
        expect(second.result.current.data?.[0].unreadCount).toBe(1)
      );
    });
  });

  describe('message:new -> messages cache', () => {
    function seedMessagesCache(
      queryClient: QueryClient,
      conversationId: string,
      messages: Message[]
    ) {
      queryClient.setQueryData<MessagesData>(['messages', conversationId], {
        pages: [{ ...EMPTY_PAGE, messages }],
        pageParams: [null],
      });
    }

    it('appends, ignores mismatched conversations, and dedupes an already-applied message', () => {
      const queryClient = makeQueryClient();
      seedMessagesCache(queryClient, 'conv-1', [makeMessage({ _id: 'm1' })]);
      renderHook(() => useSocketCacheSync(), {
        wrapper: makeWrapper(queryClient),
      });

      // Appends a live message for the open conversation.
      act(() => {
        handlers.get('message:new')?.({
          message: makeMessage({ _id: 'm2', content: 'hi there' }),
        });
      });
      expect(
        queryClient.getQueryData<MessagesData>(['messages', 'conv-1'])?.pages[0]
          .messages
      ).toHaveLength(2);

      // Ignores an event for a different conversation.
      act(() => {
        handlers.get('message:new')?.({
          message: makeMessage({ _id: 'm3', conversation: 'conv-other' }),
        });
      });
      expect(
        queryClient.getQueryData<MessagesData>(['messages', 'conv-1'])?.pages[0]
          .messages
      ).toHaveLength(2);

      // Does not duplicate a message already present.
      act(() => {
        handlers.get('message:new')?.({ message: makeMessage({ _id: 'm1' }) });
      });
      expect(
        queryClient.getQueryData<MessagesData>(['messages', 'conv-1'])?.pages[0]
          .messages
      ).toHaveLength(2);
    });

    it('reconciles a failed optimistic message with the same clientId when its delayed event arrives', () => {
      const queryClient = makeQueryClient();
      seedMessagesCache(queryClient, 'conv-1', [
        makeMessage({
          _id: 'temp-1',
          sender: 'me',
          clientId: 'client-1',
          status: 'failed',
        }),
      ]);
      renderHook(() => useSocketCacheSync(), {
        wrapper: makeWrapper(queryClient),
      });

      act(() => {
        handlers.get('message:new')?.({
          message: makeMessage({
            _id: 'real-id',
            sender: 'me',
            clientId: 'client-1',
          }),
        });
      });

      const messages = queryClient.getQueryData<MessagesData>([
        'messages',
        'conv-1',
      ])?.pages[0].messages;
      expect(messages).toHaveLength(1);
      expect(messages?.[0]._id).toBe('real-id');
      expect(messages?.[0].status).toBeUndefined();
    });
  });

  describe('message:read -> messages cache', () => {
    it('adds the reader to readBy for the matching conversation', () => {
      const queryClient = makeQueryClient();
      queryClient.setQueryData<MessagesData>(['messages', 'conv-1'], {
        pages: [
          { ...EMPTY_PAGE, messages: [makeMessage({ _id: 'm1', readBy: [] })] },
        ],
        pageParams: [null],
      });
      renderHook(() => useSocketCacheSync(), {
        wrapper: makeWrapper(queryClient),
      });

      act(() => {
        handlers.get('message:read')?.({
          conversationId: 'conv-1',
          userId: 'other-user',
        });
      });

      expect(
        queryClient.getQueryData<MessagesData>(['messages', 'conv-1'])?.pages[0]
          .messages[0].readBy
      ).toContain('other-user');
    });

    it('ignores an event for a different conversation', () => {
      const queryClient = makeQueryClient();
      queryClient.setQueryData<MessagesData>(['messages', 'conv-1'], {
        pages: [
          { ...EMPTY_PAGE, messages: [makeMessage({ _id: 'm1', readBy: [] })] },
        ],
        pageParams: [null],
      });
      renderHook(() => useSocketCacheSync(), {
        wrapper: makeWrapper(queryClient),
      });

      act(() => {
        handlers.get('message:read')?.({
          conversationId: 'conv-other',
          userId: 'other-user',
        });
      });

      expect(
        queryClient.getQueryData<MessagesData>(['messages', 'conv-1'])?.pages[0]
          .messages[0].readBy
      ).toEqual([]);
    });
  });

  describe('reconnect', () => {
    it('invalidates the inbox and all message histories after reconnect', () => {
      connected = false;
      const queryClient = makeQueryClient();
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      const { rerender } = renderHook(() => useSocketCacheSync(), {
        wrapper: makeWrapper(queryClient),
      });

      connected = true;
      rerender();

      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: CONVERSATIONS_QUERY_KEY,
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['messages'],
      });
    });
  });
});
