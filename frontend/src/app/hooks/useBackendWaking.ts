'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSocketContext } from '../utils/SocketProvider';

export type BackendStatus = 'ok' | 'waking' | 'unreachable';

// Give a normal reconnect blip (e.g. a page navigation) room to resolve
// before showing anything scary, and don't trap the user behind a
// permanent screen if the backend is actually down rather than asleep.
const WAKING_GRACE_MS = 2000;
const UNREACHABLE_AFTER_MS = 60_000;

// Only a disconnected socket while the user is authenticated is a signal
// worth acting on: an unauthenticated visitor never connects at all, and
// that's expected, not a sign the backend is asleep.
function useBackendWaking(): BackendStatus {
  const { status: sessionStatus } = useSession();
  const { connected } = useSocketContext();
  const [status, setStatus] = useState<BackendStatus>('ok');
  const isWatching = sessionStatus === 'authenticated' && !connected;

  useEffect(() => {
    if (!isWatching) {
      // Deferred rather than called synchronously so this stays a genuine
      // "subscribe and react later" effect instead of mirroring a prop
      // into state on the spot.
      const timeout = setTimeout(() => setStatus('ok'), 0);
      return () => clearTimeout(timeout);
    }

    const disconnectedSince = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - disconnectedSince;
      const next: BackendStatus =
        elapsed < WAKING_GRACE_MS
          ? 'ok'
          : elapsed < UNREACHABLE_AFTER_MS
            ? 'waking'
            : 'unreachable';
      setStatus((current) => (current === next ? current : next));
    }, 1000);

    return () => clearInterval(interval);
  }, [isWatching]);

  return status;
}

export { useBackendWaking };
