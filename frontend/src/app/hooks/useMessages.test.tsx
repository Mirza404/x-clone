import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { getConversationMessages } from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import { useMessages } from './useMessages';
import type { Message } from '../types/Message';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../utils/messageApi', () => ({
  getConversationMessages: jest.fn(),
}));

jest.mock('../utils/SocketProvider', () => ({
  useSocketContext: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedGetConversationMessages = getConversationMessages as jest.Mock;
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

function renderWithClient(conversationId: string | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useMessages(conversationId), { wrapper });
}

describe('useMessages', () => {
  let handlers: Map<string, (payload: unknown) => void>;
  let emit: jest.Mock;

  beforeEach(() => {
    mockedUseSession.mockReturnValue({ data: { user: { id: 'me' } } });
    handlers = new Map();
    emit = jest.fn();
    mockedUseSocketContext.mockReturnValue({
      emit,
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

    const [, , ack] = emit.mock.calls[0];
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

    const [, , ack] = emit.mock.calls[0];
    act(() => {
      ack({ ok: false, error: 'nope' });
    });

    await waitFor(() =>
      expect(result.current.messages[0].status).toBe('failed')
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

    act(() => {
      result.current.sendMessage('   ');
    });

    expect(emit).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });
});
