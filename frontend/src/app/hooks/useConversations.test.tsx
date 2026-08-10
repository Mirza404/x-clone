import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { getConversations } from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import { useConversations } from './useConversations';
import type { ConversationSummary } from '../types/Conversation';

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
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is disabled while unauthenticated', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated', data: null });

    renderWithClient();

    expect(mockedGetConversations).not.toHaveBeenCalled();
  });

  it('fetches conversations once authenticated', async () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'me' } },
    });
    mockedGetConversations.mockResolvedValueOnce([makeConversation()]);

    const { result } = renderWithClient();

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(mockedGetConversations).toHaveBeenCalledTimes(1);
  });

  it('never subscribes to the socket, however many times it is mounted', async () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'me' } },
    });
    mockedGetConversations.mockResolvedValue([makeConversation()]);
    const subscribe = jest.fn();
    mockedUseSocketContext.mockReturnValue({ subscribe });

    renderWithClient();
    renderWithClient();
    renderWithClient();

    await waitFor(() => expect(mockedGetConversations).toHaveBeenCalled());
    expect(subscribe).not.toHaveBeenCalled();
  });
});
