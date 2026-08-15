import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { getConversations } from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import {
  useConversations,
  useConversationsCacheBridge,
} from './useConversations';
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
    deliveredTo: [],
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

// Mounts the cache bridge (once, as SocketProvider does) plus one or more
// useConversations() consumers (as multiple UI surfaces do) sharing a client.
function mountBridgeAndConsumers(consumerCount: number) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = makeWrapper(queryClient);

  renderHook(() => useConversationsCacheBridge(), { wrapper });
  const views = Array.from({ length: consumerCount }, () =>
    renderHook(() => useConversations(), { wrapper })
  );

  return views;
}

describe('useConversations', () => {
  let handlers: Map<string, (payload: unknown) => void>;

  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'me' } },
    });
    handlers = new Map();
    mockedUseSocketContext.mockReturnValue({
      subscribe: jest.fn((event: string, handler: (p: unknown) => void) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is disabled while unauthenticated', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated', data: null });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    renderHook(() => useConversations(), { wrapper: makeWrapper(queryClient) });

    expect(mockedGetConversations).not.toHaveBeenCalled();
  });

  it('does not itself subscribe to message:new (the cache bridge owns that)', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    renderHook(() => useConversations(), { wrapper: makeWrapper(queryClient) });

    expect(mockedUseSocketContext).not.toHaveBeenCalled();
  });
});

describe('useConversationsCacheBridge', () => {
  let handlers: Map<string, (payload: unknown) => void>;

  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'me' } },
    });
    handlers = new Map();
    mockedUseSocketContext.mockReturnValue({
      subscribe: jest.fn((event: string, handler: (p: unknown) => void) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('bumps unreadCount and lastMessage for an incoming message:new', async () => {
    mockedGetConversations.mockResolvedValueOnce([
      makeConversation({ unreadCount: 1 }),
    ]);

    const [{ result }] = mountBridgeAndConsumers(1);
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

    const [{ result }] = mountBridgeAndConsumers(1);
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

  it('refetches when message:new references a conversation not yet in the cache', async () => {
    mockedGetConversations
      .mockResolvedValueOnce([makeConversation({ id: 'conv-1' })])
      .mockResolvedValueOnce([
        makeConversation({ id: 'conv-1' }),
        makeConversation({ id: 'conv-2' }),
      ]);

    const [{ result }] = mountBridgeAndConsumers(1);
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
    // mounting useConversations() at once, while only one bridge is mounted
    // (as SocketProvider guarantees in the app tree).
    const views = mountBridgeAndConsumers(3);
    await Promise.all(
      views.map(({ result }) =>
        waitFor(() => expect(result.current.data).toHaveLength(1))
      )
    );

    // Only one handler should have been registered for message:new despite
    // three mounted consumers.
    expect(handlers.size).toBe(1);

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
});
