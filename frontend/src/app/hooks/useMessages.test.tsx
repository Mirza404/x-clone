import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import {
  getConversationMessages,
  markConversationRead,
  sendMessageRest,
} from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import { CONVERSATIONS_QUERY_KEY } from './useConversations';
import { useMessages } from './useMessages';
import { upsertMessage, type MessagesData } from './messagesCacheUtils';
import type { Message } from '../types/Message';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../utils/messageApi', () => ({
  getConversationMessages: jest.fn(),
  markConversationRead: jest.fn(),
  sendMessageRest: jest.fn(),
}));

jest.mock('../utils/SocketProvider', () => ({
  useSocketContext: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedGetConversationMessages = getConversationMessages as jest.Mock;
const mockedMarkConversationRead = markConversationRead as jest.Mock;
const mockedSendMessageRest = sendMessageRest as jest.Mock;
const mockedUseSocketContext = useSocketContext as jest.Mock;

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    _id: 'm1',
    conversation: 'conv-1',
    sender: 'other-user',
    content: 'hello',
    images: [],
    readBy: [],
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
    emit = jest.fn(
      (event: string, _payload: unknown, ack?: (value: unknown) => void) => {
        if (event === 'message:read') {
          ack?.({ ok: true });
        }
      }
    );
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
      messages: [makeMessage({ _id: 'm1' }), makeMessage({ _id: 'm2' })],
    });

    const { result } = renderWithClient('conv-1');

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages.map((m) => m._id)).toEqual(['m1', 'm2']);
    expect(mockedGetConversationMessages).toHaveBeenCalledWith('conv-1', null);
  });

  it('uses the returned cursor to fetch older messages', async () => {
    mockedGetConversationMessages
      .mockResolvedValueOnce({
        nextPage: 'older-than-m3',
        messages: [makeMessage({ _id: 'm3' }), makeMessage({ _id: 'm4' })],
      })
      .mockResolvedValueOnce({
        nextPage: undefined,
        messages: [makeMessage({ _id: 'm1' }), makeMessage({ _id: 'm2' })],
      });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockedGetConversationMessages).toHaveBeenNthCalledWith(
      2,
      'conv-1',
      'older-than-m3'
    );
    await waitFor(() => expect(result.current.messages).toHaveLength(4));
    expect(result.current.messages.map((message) => message._id)).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
    ]);
  });

  // `message:new`/`message:read` cache writes are owned exclusively by
  // `useSocketCacheSync` (see useSocketCacheSync.test.tsx for that
  // write-path coverage, including dedupe and optimistic-message
  // reconciliation). This hook only needs to prove it reads that cache
  // live, which we verify by writing to it the same way the sync hook
  // does (via the shared `upsertMessage` helper) rather than firing a
  // socket event through this hook.
  it('reflects a message written live to the query cache by the socket cache sync hook', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    const { result, queryClient } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => {
      queryClient.setQueryData<MessagesData>(
        ['messages', 'conv-1'],
        (current) =>
          current
            ? {
                ...current,
                pages: upsertMessage(
                  current.pages,
                  makeMessage({ _id: 'm2', content: 'hi there' }),
                  'me'
                ),
              }
            : current
      );
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    expect(result.current.messages[1]._id).toBe('m2');
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
      messages: [makeMessage({ _id: 'm1' })],
    });

    renderWithClient('conv-1');

    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith(
        'message:read',
        { conversationId: 'conv-1' },
        expect.any(Function)
      )
    );
    expect(mockedMarkConversationRead).not.toHaveBeenCalled();
  });

  it('keeps unread state until the socket acknowledges the read', async () => {
    let acknowledgeRead: ((value: { ok: boolean }) => void) | undefined;
    emit.mockImplementation(
      (event: string, _payload: unknown, ack?: (value: unknown) => void) => {
        if (event === 'message:read') {
          acknowledgeRead = ack as (value: { ok: boolean }) => void;
        }
      }
    );
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, [
      { id: 'conv-1', unreadCount: 3 },
    ]);
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [makeMessage()],
    });

    renderWithClient('conv-1', queryClient);

    await waitFor(() => expect(acknowledgeRead).toBeDefined());
    expect(
      (
        queryClient.getQueryData(CONVERSATIONS_QUERY_KEY) as Array<{
          unreadCount: number;
        }>
      )[0].unreadCount
    ).toBe(3);

    act(() => acknowledgeRead?.({ ok: true }));

    await waitFor(() =>
      expect(
        (
          queryClient.getQueryData(CONVERSATIONS_QUERY_KEY) as Array<{
            unreadCount: number;
          }>
        )[0].unreadCount
      ).toBe(0)
    );
  });

  it('falls back to REST when the socket rejects the read', async () => {
    emit.mockImplementation(
      (event: string, _payload: unknown, ack?: (value: unknown) => void) => {
        if (event === 'message:read') {
          ack?.({ ok: false, error: 'socket persistence failed' });
        }
      }
    );
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, [
      { id: 'conv-1', unreadCount: 3 },
    ]);
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [makeMessage()],
    });

    renderWithClient('conv-1', queryClient);

    await waitFor(() =>
      expect(mockedMarkConversationRead).toHaveBeenCalledWith('conv-1')
    );
    await waitFor(() =>
      expect(
        (
          queryClient.getQueryData(CONVERSATIONS_QUERY_KEY) as Array<{
            unreadCount: number;
          }>
        )[0].unreadCount
      ).toBe(0)
    );
  });

  it('retains unread state and refetches it when socket and REST reads fail', async () => {
    emit.mockImplementation(
      (event: string, _payload: unknown, ack?: (value: unknown) => void) => {
        if (event === 'message:read') {
          ack?.({ ok: false, error: 'socket persistence failed' });
        }
      }
    );
    mockedMarkConversationRead.mockResolvedValueOnce(false);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    queryClient.setQueryData(CONVERSATIONS_QUERY_KEY, [
      { id: 'conv-1', unreadCount: 3 },
    ]);
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [makeMessage()],
    });

    renderWithClient('conv-1', queryClient);

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: CONVERSATIONS_QUERY_KEY,
      })
    );
    expect(
      (
        queryClient.getQueryData(CONVERSATIONS_QUERY_KEY) as Array<{
          unreadCount: number;
        }>
      )[0].unreadCount
    ).toBe(3);
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
      messages: [makeMessage({ _id: 'm1' })],
    });

    renderWithClient('conv-1');

    await waitFor(() =>
      expect(mockedMarkConversationRead).toHaveBeenCalledWith('conv-1')
    );
    expect(emit).not.toHaveBeenCalled();
  });

  // As above, these simulate the socket cache sync hook's write (a plain
  // cache update) rather than firing a socket event through this hook,
  // since this hook no longer subscribes to message:new itself.
  it('marks the conversation read again when a live message arrives from the other user', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    const { queryClient } = renderWithClient('conv-1');
    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith(
        'message:read',
        { conversationId: 'conv-1' },
        expect.any(Function)
      )
    );
    emit.mockClear();

    act(() => {
      queryClient.setQueryData<MessagesData>(
        ['messages', 'conv-1'],
        (current) =>
          current
            ? {
                ...current,
                pages: upsertMessage(
                  current.pages,
                  makeMessage({ _id: 'm2', sender: 'other-user' }),
                  'me'
                ),
              }
            : current
      );
    });

    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith(
        'message:read',
        { conversationId: 'conv-1' },
        expect.any(Function)
      )
    );
  });

  it('does not re-mark read for a live message the current user sent', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [makeMessage({ _id: 'm1' })],
    });

    const { queryClient } = renderWithClient('conv-1');
    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith(
        'message:read',
        { conversationId: 'conv-1' },
        expect.any(Function)
      )
    );
    emit.mockClear();

    act(() => {
      queryClient.setQueryData<MessagesData>(
        ['messages', 'conv-1'],
        (current) =>
          current
            ? {
                ...current,
                pages: upsertMessage(
                  current.pages,
                  makeMessage({ _id: 'm2', sender: 'me' }),
                  'me'
                ),
              }
            : current
      );
    });

    expect(emit).not.toHaveBeenCalled();
  });

  it('reflects a message:read cache write by exposing the reader in readBy', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [makeMessage({ _id: 'm1', sender: 'me', readBy: [] })],
    });

    const { result, queryClient } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => {
      queryClient.setQueryData<MessagesData>(
        ['messages', 'conv-1'],
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((m) => ({
                    ...m,
                    readBy: [...m.readBy, 'other-user'],
                  })),
                })),
              }
            : current
      );
    });

    await waitFor(() =>
      expect(result.current.messages[0].readBy).toContain('other-user')
    );
  });

  it('sendMessage optimistically appends then reconciles with the ack', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
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

  it('reconciles a failed optimistic message when its delayed event arrives', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [],
    });

    const { result, queryClient } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      result.current.sendMessage('hey');
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const sendCall = emit.mock.calls.find(
      ([event]) => event === 'message:send'
    ) as [string, { clientId: string }, (ack: unknown) => void];
    const [, payload, ack] = sendCall;
    act(() => {
      ack({ ok: false, error: 'uncertain result' });
    });
    await waitFor(() =>
      expect(result.current.messages[0].status).toBe('failed')
    );

    // Simulates the socket cache sync hook applying the delayed message:new
    // it eventually receives for this send.
    act(() => {
      queryClient.setQueryData<MessagesData>(
        ['messages', 'conv-1'],
        (current) =>
          current
            ? {
                ...current,
                pages: upsertMessage(
                  current.pages,
                  makeMessage({
                    _id: 'real-id',
                    content: 'hey',
                    sender: 'me',
                    clientId: payload.clientId,
                  }),
                  'me'
                ),
              }
            : current
      );
    });

    await waitFor(() => expect(result.current.messages[0]._id).toBe('real-id'));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].status).toBeUndefined();
  });

  it('generates one clientId per send and reuses it for the REST fallback when disconnected', async () => {
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
      messages: [],
    });
    mockedSendMessageRest.mockResolvedValueOnce(
      makeMessage({ _id: 'rest-id', content: 'hey', sender: 'me' })
    );

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      result.current.sendMessage('hey');
    });

    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    // The socket is disconnected, so this logical send never goes through
    // `emit` at all; the REST fallback below must still receive a clientId
    // generated for this attempt.
    expect(emit).not.toHaveBeenCalledWith(
      'message:send',
      expect.anything(),
      expect.anything()
    );

    await waitFor(() => expect(mockedSendMessageRest).toHaveBeenCalledTimes(1));
    const [, , , clientId] = mockedSendMessageRest.mock.calls[0] as [
      string,
      string,
      string[],
      string,
    ];
    expect(typeof clientId).toBe('string');
    expect(clientId.length).toBeGreaterThan(0);

    await waitFor(() => expect(result.current.messages[0]._id).toBe('rest-id'));
  });

  it('falls back to REST with the same clientId used on the socket emit when the ack times out', async () => {
    jest.useFakeTimers();
    try {
      mockedGetConversationMessages.mockResolvedValueOnce({
        nextPage: undefined,
        messages: [],
      });
      mockedSendMessageRest.mockResolvedValueOnce(
        makeMessage({ _id: 'rest-id', content: 'hey', sender: 'me' })
      );

      const { result } = renderWithClient('conv-1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      act(() => {
        result.current.sendMessage('hey');
      });

      await waitFor(() => expect(result.current.messages).toHaveLength(1));

      const sendCall = emit.mock.calls.find(
        ([event]) => event === 'message:send'
      );
      const [, sendPayload] = sendCall as [string, { clientId: string }];
      const socketClientId = sendPayload.clientId;

      // The ack never arrives; advance past the ack timeout so the fallback
      // fires. No new call to sendMessage happens here, so if the fallback
      // reuses socketClientId it proves the id was generated once up front
      // rather than being regenerated for this retry.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(10_000);
      });

      expect(mockedSendMessageRest).toHaveBeenCalledWith(
        'conv-1',
        'hey',
        [],
        socketClientId
      );

      await waitFor(() =>
        expect(result.current.messages[0]._id).toBe('rest-id')
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('retryMessage re-sends a failed message with the same clientId and can fail again visibly', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      result.current.sendMessage('hey');
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const firstSendCall = emit.mock.calls.find(
      ([event]) => event === 'message:send'
    ) as [string, { clientId: string }, (ack: unknown) => void];
    const [, firstPayload, firstAck] = firstSendCall;
    act(() => {
      firstAck({ ok: false, error: 'nope' });
    });
    await waitFor(() =>
      expect(result.current.messages[0].status).toBe('failed')
    );

    const tempId = result.current.messages[0]._id;
    emit.mockClear();

    act(() => {
      result.current.retryMessage(tempId);
    });

    await waitFor(() =>
      expect(result.current.messages[0].status).toBe('sending')
    );

    const retrySendCall = emit.mock.calls.find(
      ([event]) => event === 'message:send'
    ) as [string, { clientId: string }, (ack: unknown) => void];
    const [, retryPayload, retryAck] = retrySendCall;
    expect(retryPayload.clientId).toBe(firstPayload.clientId);

    act(() => {
      retryAck({ ok: false, error: 'still down' });
    });

    await waitFor(() =>
      expect(result.current.messages[0].status).toBe('failed')
    );
    expect(result.current.messages).toHaveLength(1);
  });

  it('retries a failed REST fallback with the original clientId while disconnected', async () => {
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
      messages: [],
    });
    mockedSendMessageRest
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        makeMessage({ _id: 'rest-id', content: 'hey', sender: 'me' })
      );

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => {
      result.current.sendMessage('hey');
    });
    await waitFor(() =>
      expect(result.current.messages[0].status).toBe('failed')
    );

    const tempId = result.current.messages[0]._id;
    const firstClientId = mockedSendMessageRest.mock.calls[0]?.[3];

    act(() => {
      result.current.retryMessage(tempId);
    });

    await waitFor(() => expect(mockedSendMessageRest).toHaveBeenCalledTimes(2));
    expect(mockedSendMessageRest.mock.calls[1]?.[3]).toBe(firstClientId);
    await waitFor(() => expect(result.current.messages[0]._id).toBe('rest-id'));
    expect(emit.mock.calls.some(([event]) => event === 'message:send')).toBe(
      false
    );
  });

  // Reconnect backfill is no longer this hook's concern: useSocketCacheSync
  // invalidates the whole ['messages'] family on reconnect, which refetches
  // this hook's active query automatically (React Query's own contract).
  // See useSocketCacheSync.test.tsx, "invalidates the inbox and all message
  // histories after reconnect".

  it('does nothing for blank content', async () => {
    mockedGetConversationMessages.mockResolvedValueOnce({
      nextPage: undefined,
      messages: [],
    });

    const { result } = renderWithClient('conv-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith(
        'message:read',
        { conversationId: 'conv-1' },
        expect.any(Function)
      )
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
