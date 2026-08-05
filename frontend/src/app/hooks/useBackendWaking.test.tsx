import { renderHook, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useSocketContext } from '../utils/SocketProvider';
import { useBackendWaking } from './useBackendWaking';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../utils/SocketProvider', () => ({
  useSocketContext: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUseSocketContext = useSocketContext as jest.Mock;

describe('useBackendWaking', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('reports ok when the socket is connected', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedUseSocketContext.mockReturnValue({ connected: true });

    const { result } = renderHook(() => useBackendWaking());

    expect(result.current).toBe('ok');
  });

  it('reports ok when unauthenticated, even if disconnected', () => {
    mockedUseSession.mockReturnValue({ status: 'unauthenticated' });
    mockedUseSocketContext.mockReturnValue({ connected: false });

    const { result } = renderHook(() => useBackendWaking());

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(result.current).toBe('ok');
  });

  it('does not report waking on the first tick after disconnecting', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedUseSocketContext.mockReturnValue({ connected: false });

    const { result } = renderHook(() => useBackendWaking());

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toBe('ok');
  });

  it('reports waking once disconnected past the grace period', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedUseSocketContext.mockReturnValue({ connected: false });

    const { result } = renderHook(() => useBackendWaking());

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current).toBe('waking');
  });

  it('reports unreachable after a full minute of disconnection', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedUseSocketContext.mockReturnValue({ connected: false });

    const { result } = renderHook(() => useBackendWaking());

    act(() => {
      jest.advanceTimersByTime(61_000);
    });

    expect(result.current).toBe('unreachable');
  });

  it('returns to ok once the socket reconnects', () => {
    mockedUseSession.mockReturnValue({ status: 'authenticated' });
    mockedUseSocketContext.mockReturnValue({ connected: false });

    const { result, rerender } = renderHook(() => useBackendWaking());

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current).toBe('waking');

    mockedUseSocketContext.mockReturnValue({ connected: true });
    rerender();

    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(result.current).toBe('ok');
  });
});
