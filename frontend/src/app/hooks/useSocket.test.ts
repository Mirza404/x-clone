import { renderHook, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { getSocket } from '../lib/socket';
import { useSocket } from './useSocket';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../lib/socket', () => ({
  getSocket: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedGetSocket = getSocket as jest.Mock;

function createFakeSocket() {
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    connected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)?.add(handler);
    }),
    off: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.get(event)?.delete(handler);
    }),
    trigger(event: string, ...args: unknown[]) {
      handlers.get(event)?.forEach((handler) => handler(...args));
    },
  };
}

describe('useSocket', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('connects the socket when authenticated', () => {
    const fakeSocket = createFakeSocket();
    mockedGetSocket.mockReturnValue(fakeSocket);
    mockedUseSession.mockReturnValue({ status: 'authenticated' });

    renderHook(() => useSocket());

    expect(fakeSocket.connect).toHaveBeenCalled();
  });

  it('does not connect when unauthenticated', () => {
    const fakeSocket = createFakeSocket();
    mockedGetSocket.mockReturnValue(fakeSocket);
    mockedUseSession.mockReturnValue({ status: 'unauthenticated' });

    renderHook(() => useSocket());

    expect(fakeSocket.connect).not.toHaveBeenCalled();
  });

  it('reflects connect/disconnect events in the returned state', () => {
    const fakeSocket = createFakeSocket();
    mockedGetSocket.mockReturnValue(fakeSocket);
    mockedUseSession.mockReturnValue({ status: 'authenticated' });

    const { result } = renderHook(() => useSocket());

    expect(result.current.connected).toBe(false);

    act(() => {
      fakeSocket.trigger('connect');
    });
    expect(result.current.connected).toBe(true);

    act(() => {
      fakeSocket.trigger('disconnect');
    });
    expect(result.current.connected).toBe(false);
  });

  it('emit forwards to socket.emit with an ack when provided', () => {
    const fakeSocket = createFakeSocket();
    mockedGetSocket.mockReturnValue(fakeSocket);
    mockedUseSession.mockReturnValue({ status: 'authenticated' });

    const { result } = renderHook(() => useSocket());
    const ack = jest.fn();

    act(() => {
      result.current.emit('message:send', { content: 'hi' }, ack);
    });

    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'message:send',
      { content: 'hi' },
      ack
    );
  });

  it('subscribe registers and unsubscribes a handler', () => {
    const fakeSocket = createFakeSocket();
    mockedGetSocket.mockReturnValue(fakeSocket);
    mockedUseSession.mockReturnValue({ status: 'authenticated' });

    const { result } = renderHook(() => useSocket());
    const handler = jest.fn();

    let unsubscribe: () => void = () => {};
    act(() => {
      unsubscribe = result.current.subscribe('message:new', handler);
    });

    act(() => {
      fakeSocket.trigger('message:new', { hello: 'world' });
    });
    expect(handler).toHaveBeenCalledWith({ hello: 'world' });

    act(() => {
      unsubscribe();
      fakeSocket.trigger('message:new', { hello: 'again' });
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('disconnects on unmount', () => {
    const fakeSocket = createFakeSocket();
    mockedGetSocket.mockReturnValue(fakeSocket);
    mockedUseSession.mockReturnValue({ status: 'authenticated' });

    const { unmount } = renderHook(() => useSocket());
    unmount();

    expect(fakeSocket.disconnect).toHaveBeenCalled();
  });
});
