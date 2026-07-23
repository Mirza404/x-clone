import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import {
  getConversationMessages,
  markConversationRead,
} from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import { useMessages } from './useMessages';
import type { Message } from '../types/Message';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../utils/messageApi', () => ({
  getConversationMessages: jest.fn(),
  markConversationRead: jest.fn(),
}));

jest.mock('../utils/SocketProvider', () => ({
  useSocketContext: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedGetConversationMessages = getConversationMessages as jest.Mock;
const mockedMarkConversationRead = markConversationRead as jest.Mock;
const mockedUseSocketContext = useSocketContext as jest.Mock;

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    _id: 'm1',
    conversation: 'conv-1',
    sender: 'other-user',
    content: 'hello',
    readBy: [],
    deliveredTo: [],
    createdAt: new Date(0).toISOString(),
    ...overrides,
  };
}

function renderWithClient(
  conversationId: string | null,
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return {
    ...renderHook(() => useMessages(conversationId), { wrapper }),
    queryClient,
  };
}

describe('useMessages', () => {
  let handlers: Map<string, (payload: unknown) => void>;
  let emit: jest.Mock;

  beforeEach(() => {
    mockedUseSession.mockReturnValue({ data: { user: { id: 'me' } } });
    handlers = new Map();
    emit = jest.fn();
    mockedMarkConversationRead.mockResolvedValue(true);
    mockedUseSocketContext.mockReturnValue({
      emit,
      connected: true,
      subscribe: jest.fn((event: string, handler: (p: unknown) => void) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads the initial page in chronological order', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' }), makeMessage({ _id: 'm2' })],
    });

    const { result } = renderWithClient('conv-1');

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages.map((m) => m._id)).toEqual(['m1', 'm2']);
  });

  it('appends a live message:new event for the open conversation', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => {
      handlers.get('message:new')?.({
        message: makeMessage({ _id: 'm2', content: 'hi there' }),
      });
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[1]._id).toBe('m2');
  });

  it('ignores message:new events for a different conversation', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => {
      handlers.get('message:new')?.({
        message: makeMessage({ _id: 'm2', conversation: 'conv-other' }),
      });
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it('does not duplicate a message already applied via message:new', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => {
      handlers.get('message:new')?.({ message: makeMessage({ _id: 'm1' }) });
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it('zeroes the cached unreadCount for this conversation once marked read', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(
      ['conversations'],
      [
        { id: 'conv-1', unreadCount: 3 },
        { id: 'conv-2', unreadCount: 5 },
      ]
    );
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    renderWithClient('conv-1', queryClient);

    await waitFor(() =>
      expect(
        (
          queryClient.getQueryData(['conversations']) as Array<{
            id: string;
            unreadCount: number;
          }>
        ).find((c) => c.id === 'conv-1')?.unreadCount
      ).toBe(0)
    );
    expect(
      (
        queryClient.getQueryData(['conversations']) as Array<{
          id: string;
          unreadCount: number;
        }>
      ).find((c) => c.id === 'conv-2')?.unreadCount
    ).toBe(5);
  });

  it('marks the conversation read over the socket once loaded', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    renderWithClient('conv-1');

    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith('message:read', {
        conversationId: 'conv-1',
      })
    );
    expect(mockedMarkConversationRead).not.toHaveBeenCalled();
  });

  it('falls back to the REST endpoint to mark read when the socket is disconnected', async () => {
    mockedUseSocketContext.mockReturnValue({
      emit,
      connected: false,
      subscribe: jest.fn((event: string, handler: (p: unknown) => void) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    });
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    renderWithClient('conv-1');

    await waitFor(() =>
      expect(mockedMarkConversationRead).toHaveBeenCalledWith('conv-1')
    );
    expect(emit).not.toHaveBeenCalled();
  });

  it('marks the conversation read again when a live message arrives from the other user', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    renderWithClient('conv-1');
    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith('message:read', {
        conversationId: 'conv-1',
      })
    );
    emit.mockClear();

    act(() => {
      handlers.get('message:new')?.({
        message: makeMessage({ _id: 'm2', sender: 'other-user' }),
      });
    });

    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith('message:read', {
        conversationId: 'conv-1',
      })
    );
  });

  it('does not re-mark read for a live message the current user sent', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    renderWithClient('conv-1');
    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith('message:read', {
        conversationId: 'conv-1',
      })
    );
    emit.mockClear();

    act(() => {
      handlers.get('message:new')?.({
        message: makeMessage({ _id: 'm2', sender: 'me' }),
      });
    });

    expect(emit).not.toHaveBeenCalled();
  });

  it('applies a message:read event by adding the reader to readBy', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1', sender: 'me', readBy: [] })],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => {
      handlers.get('message:read')?.({
        conversationId: 'conv-1',
        userId: 'other-user',
      });
    });

    await waitFor(() =>
      expect(result.current.messages[0].readBy).toContain('other-user')
    );
  });

  it('ignores a message:read event for a different conversation', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1', sender: 'me', readBy: [] })],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => {
      handlers.get('message:read')?.({
        conversationId: 'conv-other',
        userId: 'other-user',
      });
    });

    expect(result.current.messages[0].readBy).toEqual([]);
  });

  it('sendMessage optimistically appends then reconciles with the ack', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      result.current.sendMessage('hey');
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.messages[0].status).toBe('sending');

    const sendCall = emit.mock.calls.find(
      ([event]) => event === 'message:send'
    );
    const [, , ack] = sendCall as [string, unknown, (ack: unknown) => void];
    act(() => {
      ack({
        ok: true,
        message: makeMessage({ _id: 'real-id', content: 'hey', sender: 'me' }),
      });
    });

    await waitFor(() => expect(result.current.messages[0]._id).toBe('real-id'));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].status).toBeUndefined();
  });

  it('sendMessage marks the message failed when the ack reports an error', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      result.current.sendMessage('hey');
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const sendCall = emit.mock.calls.find(
      ([event]) => event === 'message:send'
    );
    const [, , ack] = sendCall as [string, unknown, (ack: unknown) => void];
    act(() => {
      ack({ ok: false, error: 'nope' });
    });

    await waitFor(() =>
      expect(result.current.messages[0].status).toBe('failed')
    );
  });

  it('refetches on reconnect to backfill any gap, but not on the initial connect', async () => {
    mockedGetConversationMessages.mockResolvedValue({
      nextPage: undefined,
      previousPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    const { rerender } = renderWithClient('conv-1');
    await waitFor(() =>
      expect(mockedGetConversationMessages).toHaveBeenCalledTimes(1)
    );

    mockedUseSocketContext.mockReturnValue({
      emit,
      connected: false,
      subscribe: jest.fn((event: string, handler: (p: unknown) => void) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    });
    rerender();
    expect(mockedGetConversationMessages).toHaveBeenCalledTimes(1);

    mockedUseSocketContext.mockReturnValue({
      emit,
      connected: true,
      subscribe: jest.fn((event: string, handler: (p: unknown) => void) => {
        handlers.set(event, handler);
        return () => handlers.delete(event);
      }),
    });
    rerender();

    await waitFor(() =>
      expect(mockedGetConversationMessages).toHaveBeenCalledTimes(2)
    );
  });

  it('does nothing for blank content', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      previousPage: undefined,
      messages: [],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith('message:read', {
        conversationId: 'conv-1',
      })
    );

    act(() => {
      result.current.sendMessage('   ');
    });

    expect(emit).not.toHaveBeenCalledWith(
      'message:send',
      expect.anything(),
      expect.anything()
    );
    expect(result.current.messages).toHaveLength(0);
  });
});
