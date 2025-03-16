'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 bg-black bg-opacity-80 backdrop-blur-sm border-b border-gray-800 md:hidden">
      <div className="flex justify-between items-center h-14 px-4">
        {/* Left side - Profile image or back button */}
        <div className="flex items-center">
          {session?.user?.image && (
            <img
              src={session.user.image || '/placeholder.svg'}
              alt="Profile"
              className="w-8 h-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="flex items-center justify-center font-bold ml-2 ">
            Home
          </div>
        </div>
      </div>
    </div>
  );
}
