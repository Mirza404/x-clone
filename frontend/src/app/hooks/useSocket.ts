'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket';

interface UseSocketResult {
  socket: Socket;
  connected: boolean;
  onlineUsers: Record<string, boolean>;
  emit: <TPayload, TAck = unknown>(
    event: string,
    payload: TPayload,
    ack?: (response: TAck) => void
  ) => void;
  subscribe: (
    event: string,
    handler: (...args: unknown[]) => void
  ) => () => void;
}

interface PresenceEvent {
  userId: string;
  online: boolean;
}

function isPresenceEvent(value: unknown): value is PresenceEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { userId?: unknown }).userId === 'string' &&
    typeof (value as { online?: unknown }).online === 'boolean'
  );
}

function useSocket(): UseSocketResult {
  const { status } = useSession();
  const socket = getSocket();
  const [connected, setConnected] = useState(socket.connected);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    const handlePresence = (raw: unknown) => {
      if (!isPresenceEvent(raw)) {
        return;
      }
      setOnlineUsers((prev) => ({ ...prev, [raw.userId]: raw.online }));
    };

    socket.on('presence', handlePresence);
    return () => {
      socket.off('presence', handlePresence);
    };
  }, [socket]);

  useEffect(() => {
    if (status === 'authenticated') {
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, [socket, status]);

  const emit = useCallback(
    <TPayload, TAck = unknown>(
      event: string,
      payload: TPayload,
      ack?: (response: TAck) => void
    ) => {
      if (ack) {
        socket.emit(event, payload, ack);
      } else {
        socket.emit(event, payload);
      }
    },
    [socket]
  );

  const subscribe = useCallback(
    (event: string, handler: (...args: unknown[]) => void) => {
      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    },
    [socket]
  );

  return { socket, connected, onlineUsers, emit, subscribe };
}

export { useSocket };
