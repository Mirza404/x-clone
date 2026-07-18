'use client';

import { useState } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { MoreHorizontal } from 'lucide-react';
import Avatar from './Avatar';
import { toHandle } from '../../utils/handle';

const ProfileTab = () => {
  const { data: session, status } = useSession();
  const [showSignOutText, setShowSignOutText] = useState(false);

  const handleClick = async () => {
    if (session) {
      await signOut({ callbackUrl: '/' });
    } else {
      await signIn('google', { callbackUrl: '/posts' });
    }
  };

  if (status === 'loading') {
    return (
      <div className="relative flex h-[52px] w-full items-center rounded-full p-3 text-content">
        <div className="flex w-full items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-content"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <button
        type="button"
        className="relative flex h-[52px] w-full items-center justify-center rounded-full bg-primary p-3 font-bold text-white transition-colors hover:bg-primary-hover"
        onClick={handleClick}
      >
        Sign In
      </button>
    );
  }

  const handle = toHandle(session?.user?.name);

  return (
    <div
      className="relative flex h-[52px] w-full cursor-pointer items-center rounded-full p-2 text-content transition-colors hover:bg-hover"
      onMouseEnter={() => setShowSignOutText(true)}
      onMouseLeave={() => setShowSignOutText(false)}
    >
      <button
        className="flex w-full items-center gap-3 text-left"
        onClick={handleClick}
      >
        <Avatar src={session?.user?.image} alt={session?.user?.name ?? 'Profile'} size="sm" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-[15px] font-bold leading-5">
            {showSignOutText ? 'Sign Out' : session?.user?.name}
          </span>
          {handle && (
            <span className="block truncate text-[13px] leading-4 text-muted">
              {handle}
            </span>
          )}
        </div>
        <span className="flex w-8 flex-shrink-0 items-center justify-center">
          <MoreHorizontal className="h-[18px] w-[18px] text-muted" />
        </span>
      </button>
    </div>
  );
};

export default ProfileTab;
