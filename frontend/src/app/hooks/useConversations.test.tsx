import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { getConversations } from '../utils/messageApi';
import { useSocketContext } from '../utils/SocketProvider';
import { useConversations } from './useConversations';

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

describe('useConversations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is disabled while unauthenticated', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated', data: null });

    renderHook(() => useConversations(), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    expect(mockedGetConversations).not.toHaveBeenCalled();
  });

  it('fetches conversations while authenticated', async () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'me' } },
    });
    mockedGetConversations.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useConversations(), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('does not itself subscribe to any socket event (useSocketCacheSync owns that)', () => {
    mockedUseSession.mockReturnValue({
      status: 'authenticated',
      data: { user: { id: 'me' } },
    });
    mockedGetConversations.mockResolvedValueOnce([]);

    renderHook(() => useConversations(), {
      wrapper: makeWrapper(makeQueryClient()),
    });

    expect(mockedUseSocketContext).not.toHaveBeenCalled();
  });
});
