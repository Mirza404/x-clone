import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { getConversations } from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import { useConversations } from './useConversations';
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
    readBy: [],
    deliveredTo: [],
    createdAt: new Date(1).toISOString(),
    ...overrides,
  };
}

function renderWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useConversations(), { wrapper });
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

    renderWithClient();

    expect(mockedGetConversations).not.toHaveBeenCalled();
  });

  it('bumps unreadCount and lastMessage for an incoming message:new', async () => {
    mockedGetConversations.mockResolvedValueOnce([
      makeConversation({ unreadCount: 1 }),
    ]);

    const { result } = renderWithClient();
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

    const { result } = renderWithClient();
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

    const { result } = renderWithClient();
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    act(() => {
      handlers.get('message:new')?.({
        message: makeMessage({ conversation: 'conv-2' }),
      });
    });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(mockedGetConversations).toHaveBeenCalledTimes(2);
  });
});
