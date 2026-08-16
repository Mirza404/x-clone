'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';

type SocketContextValue = ReturnType<typeof useSocket>;

const SocketContext = createContext<SocketContextValue | null>(null);

export default function SocketProvider({ children }: { children: ReactNode }) {
  const value = useSocket();
  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
