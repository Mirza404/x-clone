'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Socket } from 'socket.io-client';
import { getSocket } from '../lib/socket';

interface UseSocketResult {
  socket: Socket;
  connected: boolean;
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

function useSocket(): UseSocketResult {
  const { status } = useSession();
  const socket = getSocket();
  const [connected, setConnected] = useState(socket.connected);

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

  return { socket, connected, emit, subscribe };
}

export { useSocket };
