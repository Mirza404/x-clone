'use client';

import { useState } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { MoreHorizontal } from 'lucide-react';

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
      <div className="relative flex h-[52px] w-full items-center rounded-full p-3 text-x-text">
        <div className="flex w-full items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-x-border border-t-x-text"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <button
        type="button"
        className="relative flex h-[52px] w-full items-center justify-center rounded-full bg-x-blue p-3 font-bold text-white transition-colors hover:bg-x-blue-hover"
        onClick={handleClick}
      >
        Sign In
      </button>
    );
  }

  return (
    <div
      className="relative flex h-[52px] w-full cursor-pointer items-center rounded-full p-2 text-x-text transition-colors hover:bg-x-hover"
      onMouseEnter={() => setShowSignOutText(true)}
      onMouseLeave={() => setShowSignOutText(false)}
    >
      <button
        className="flex w-full items-center gap-3 text-left"
        onClick={handleClick}
      >
        <img
          className="h-9 w-9 flex-shrink-0 rounded-full"
          src={session?.user?.image ?? '/Logo.png'}
          referrerPolicy="no-referrer"
          alt={session?.user?.name ?? 'Profile'}
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-[15px] font-bold leading-5">
            {showSignOutText ? 'Sign Out' : session?.user?.name}
          </span>
        </div>
        <span className="flex w-8 flex-shrink-0 items-center justify-center">
          <MoreHorizontal className="h-[18px] w-[18px] text-x-text-secondary" />
        </span>
      </button>
    </div>
  );
};

export default ProfileTab;
