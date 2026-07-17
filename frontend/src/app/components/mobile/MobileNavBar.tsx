'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const TABS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/posts', icon: Home, label: 'Home' },
  { href: '/explore', icon: Search, label: 'Explore' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/messages', icon: Mail, label: 'Messages' },
];

export default function MobileNavBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-x-border bg-x-black md:hidden">
      <div className="flex h-14 items-center justify-around">
        {TABS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex w-full flex-col items-center justify-center"
              aria-label={label}
            >
              <Icon
                className={`h-6 w-6 ${isActive ? 'text-x-text' : 'text-x-text-secondary'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
