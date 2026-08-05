'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useBackendWaking } from '@/app/hooks/useBackendWaking';

export default function BackendWakingBanner() {
  const status = useBackendWaking();
  const [dismissed, setDismissed] = useState(false);

  // Reset the dismissal once things recover, so a later cold start still
  // gets a banner instead of staying silenced from an earlier session.
  // Deferred via setTimeout so this is a genuine async reaction to the
  // status change rather than a synchronous mirror-into-state.
  useEffect(() => {
    if (status !== 'ok') {
      return;
    }
    const timeout = setTimeout(() => setDismissed(false), 0);
    return () => clearTimeout(timeout);
  }, [status]);

  if (status === 'ok' || dismissed) {
    return null;
  }

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-yellow-500/10 px-4 py-2 text-[13px] text-yellow-600">
      <span>
        {status === 'waking'
          ? 'Waking the server up — free hosting sleeps after inactivity, this can take up to a minute.'
          : "Can't reach the server right now. Some actions may not work."}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="flex-shrink-0 rounded-full p-1 hover:bg-black/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
