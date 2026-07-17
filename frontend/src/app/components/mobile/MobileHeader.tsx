'use client';

import { useSession } from 'next-auth/react';

export default function MobileHeader() {
  const { data: session } = useSession();

  return (
    <div className="sticky top-0 z-40 border-b border-x-border bg-x-black/80 backdrop-blur-sm md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left side - Profile image or back button */}
        <div className="flex items-center">
          {session?.user?.image && (
            <img
              src={session.user.image || '/placeholder.svg'}
              alt="Profile"
              className="h-8 w-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="ml-2 flex items-center justify-center text-lg font-bold text-x-text">
            Home
          </div>
        </div>
      </div>
    </div>
  );
}
