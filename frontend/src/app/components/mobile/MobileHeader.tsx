'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Avatar from '../ui/Avatar';

// `/posts` is deliberately absent: the feed's own sticky "For you / Following"
// tab bar is the header there, so a second "Home" bar above it was pure
// duplication (and pushed the tabs out of their sticky slot).
const ROUTE_LABELS: Record<string, string> = {
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
        <div className="flex min-w-0 items-center">
          <Link href="/profile" aria-label="Your profile">
            <Avatar
              src={session?.user?.image}
              alt={session?.user?.name ?? 'Profile'}
              size="sm"
            />
          </Link>
          <div className="ml-2 min-w-0 truncate text-lg font-bold text-content">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
