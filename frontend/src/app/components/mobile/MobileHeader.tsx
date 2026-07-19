'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const ROUTE_LABELS: Record<string, string> = {
  '/posts': 'Home',
  '/explore': 'Explore',
  '/notifications': 'Notifications',
  '/messages': 'Messages',
  '/bookmarks': 'Bookmarks',
  '/jobs': 'Jobs',
  '/communities': 'Communities',
  '/premium': 'Premium',
  '/verifiedorgs': 'Verified Orgs',
  '/profile': 'Profile',
};

export default function MobileHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const label = ROUTE_LABELS[pathname];

  if (!label) {
    return null;
  }

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-sm md:hidden">
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
          <div className="ml-2 flex items-center justify-center text-lg font-bold text-content">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
