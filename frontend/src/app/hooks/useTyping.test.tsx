import { renderHook, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useSocketContext } from '../utils/SocketProvider';
import { useTyping } from './useTyping';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('../utils/SocketProvider', () => ({
  useSocketContext: jest.fn(),
}));

const mockedUseSession = useSession as jest.Mock;
const mockedUseSocketContext = useSocketContext as jest.Mock;

describe('useTyping', () => {
  let handlers: Map<string, (payload: unknown) => void>;
  let emit: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
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
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('emits typing:start once per burst and typing:stop after the debounce delay', () => {
    const { result } = renderHook(() => useTyping('conv-1'));

    act(() => {
      result.current.notifyTyping();
      result.current.notifyTyping();
      result.current.notifyTyping();
    });

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('typing:start', {
      conversationId: 'conv-1',
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith('typing:stop', {
      conversationId: 'conv-1',
    });
  });

  it('stopTypingNow cancels the pending debounce and emits typing:stop immediately', () => {
    const { result } = renderHook(() => useTyping('conv-1'));

    act(() => {
      result.current.notifyTyping();
    });
    expect(emit).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stopTypingNow();
    });

    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenLastCalledWith('typing:stop', {
      conversationId: 'conv-1',
    });

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('stopTypingNow does nothing when not currently typing', () => {
    const { result } = renderHook(() => useTyping('conv-1'));

    act(() => {
      result.current.stopTypingNow();
    });

    expect(emit).not.toHaveBeenCalled();
  });

  it('sets isPeerTyping when the other participant starts typing', () => {
    const { result } = renderHook(() => useTyping('conv-1'));

    act(() => {
      handlers.get('typing')?.({
        conversationId: 'conv-1',
        userId: 'other-user',
        isTyping: true,
      });
    });

    expect(result.current.isPeerTyping).toBe(true);
  });

  it('clears isPeerTyping when the other participant stops typing', () => {
    const { result } = renderHook(() => useTyping('conv-1'));

    act(() => {
      handlers.get('typing')?.({
        conversationId: 'conv-1',
        userId: 'other-user',
        isTyping: true,
      });
    });
    expect(result.current.isPeerTyping).toBe(true);

    act(() => {
      handlers.get('typing')?.({
        conversationId: 'conv-1',
        userId: 'other-user',
        isTyping: false,
      });
    });
    expect(result.current.isPeerTyping).toBe(false);
  });

  it('auto-clears isPeerTyping if no further typing event arrives', () => {
    const { result } = renderHook(() => useTyping('conv-1'));

    act(() => {
      handlers.get('typing')?.({
        conversationId: 'conv-1',
        userId: 'other-user',
        isTyping: true,
      });
    });
    expect(result.current.isPeerTyping).toBe(true);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.isPeerTyping).toBe(false);
  });

  it('ignores typing events the current user emitted (multi-tab echo)', () => {
    const { result } = renderHook(() => useTyping('conv-1'));

    act(() => {
      handlers.get('typing')?.({
        conversationId: 'conv-1',
        userId: 'me',
        isTyping: true,
      });
    });

    expect(result.current.isPeerTyping).toBe(false);
  });

  it('ignores typing events for a different conversation', () => {
    const { result } = renderHook(() => useTyping('conv-1'));

    act(() => {
      handlers.get('typing')?.({
        conversationId: 'conv-other',
        userId: 'other-user',
        isTyping: true,
      });
    });

    expect(result.current.isPeerTyping).toBe(false);
  });

  it('resets peer-typing state when the conversation changes', () => {
    const { result, rerender } = renderHook(
      ({ conversationId }) => useTyping(conversationId),
      { initialProps: { conversationId: 'conv-1' } }
    );

    act(() => {
      handlers.get('typing')?.({
        conversationId: 'conv-1',
        userId: 'other-user',
        isTyping: true,
      });
    });
    expect(result.current.isPeerTyping).toBe(true);

    rerender({ conversationId: 'conv-2' });

    expect(result.current.isPeerTyping).toBe(false);
  });

  it('does nothing when there is no conversation selected', () => {
    const { result } = renderHook(() => useTyping(null));

    act(() => {
      result.current.notifyTyping();
    });

    expect(emit).not.toHaveBeenCalled();
  });
});
