'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useConversations } from '@/app/hooks/useConversations';

const TABS: { href: string; icon: LucideIcon; label: string }[] = [
  { href: '/posts', icon: Home, label: 'Home' },
  { href: '/explore', icon: Search, label: 'Explore' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/messages', icon: Mail, label: 'Messages' },
];

export default function MobileNavBar() {
  const pathname = usePathname();
  const { data: conversations } = useConversations();
  const unreadMessagesCount =
    conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg md:hidden">
      <div className="flex h-14 items-center justify-around">
        {TABS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          const badgeCount = href === '/messages' ? unreadMessagesCount : 0;
          return (
            <Link
              key={href}
              href={href}
              className="flex w-full flex-col items-center justify-center"
              aria-label={label}
            >
              <span className="relative">
                <Icon
                  className={`h-6 w-6 ${isActive ? 'text-content' : 'text-muted'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {badgeCount > 0 && (
                  <span
                    aria-label={`${badgeCount} unread messages`}
                    className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white"
                  >
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
