'use client';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Search,
  Bell,
  Bookmark,
  Briefcase,
  Users,
  Sparkles,
  BadgeCheck,
  User,
  MoreHorizontal,
  Pen,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import ProfileTab from './ProfileTab';
import ThemeToggle from './ThemeToggle';
import { usePostModal } from '@/app/utils/PostModalProvider';

interface NavLinkItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Messages is deliberately absent here: it now lives in its own full-bleed
// layout (frontend/src/app/messages/layout.tsx) and is reached via the
// floating chat button (FloatingActions) or MessagePopover's expand link,
// not this labeled nav.
const NAV_ITEMS: NavLinkItem[] = [
  { href: '/posts', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/communities', label: 'Communities', icon: Users },
  { href: '/premium', label: 'Premium', icon: Sparkles },
  { href: '/verifiedorgs', label: 'Verified Orgs', icon: BadgeCheck },
  { href: '/profile', label: 'Profile', icon: User },
];

function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  iconOnly,
}: NavLinkItem & { isActive: boolean; iconOnly: boolean }) {
  return (
    <li>
      <Link
        href={href}
        aria-label={label}
        className={`flex w-fit items-center gap-4 rounded-full py-3 text-content transition-colors hover:bg-hover ${
          iconOnly ? 'justify-center px-3' : 'pl-3 pr-5'
        } ${isActive ? 'font-bold' : 'font-normal'}`}
      >
        <Icon
          className="h-[26px] w-[26px] flex-shrink-0"
          strokeWidth={isActive ? 2.5 : 2}
        />
        {!iconOnly && <span className="text-xl">{label}</span>}
      </Link>
    </li>
  );
}

export default function NavMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { openPostModal } = usePostModal();
  const iconOnly = pathname.startsWith('/messages');

  const handlePostClick = () => {
    if (!session) {
      router.push('/api/auth/signin');
      return;
    }
    openPostModal();
  };

  return (
    <div className="sticky top-0 flex h-screen flex-col justify-between py-1">
      <nav>
        <Link
          href="/posts"
          className="mb-1 flex h-[50px] w-[50px] items-center justify-center rounded-full transition-colors hover:bg-hover"
          aria-label="X"
        >
          <svg
            className="h-7 w-7 text-content"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M13.795 10.533 20.68 2h-3.073l-5.255 6.517L7.69 2H1l7.806 10.91L1.47 22h3.074l5.705-7.07L15.31 22H22l-8.205-11.467Zm-2.38 2.95L9.97 11.464 4.36 3.627h2.31l4.528 6.317 1.443 2.02 6.018 8.409h-2.31l-4.934-6.89Z" />
          </svg>
        </Link>

        <ul className="flex flex-col">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              isActive={pathname === item.href}
              iconOnly={iconOnly}
            />
          ))}
          <li>
            <Menu as="div" className="relative w-fit">
              <Menu.Button
                aria-label="More"
                className={`flex w-fit items-center gap-4 rounded-full py-3 text-content transition-colors hover:bg-hover ${
                  iconOnly ? 'justify-center px-3' : 'pl-3 pr-5'
                }`}
              >
                <MoreHorizontal className="h-[26px] w-[26px] flex-shrink-0" />
                {!iconOnly && <span className="text-xl">More</span>}
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute bottom-full left-0 mb-2 w-72 origin-bottom-left rounded-2xl border border-border-strong bg-bg p-2 shadow-lg focus:outline-none">
                  <div className="px-2 py-1.5 text-xs font-bold uppercase text-muted">
                    Display
                  </div>
                  <Menu.Item>
                    <ThemeToggle />
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </li>
        </ul>

        <button
          type="button"
          onClick={handlePostClick}
          aria-label="Post"
          className={`mt-4 flex h-[52px] items-center justify-center rounded-full bg-btn text-[17px] font-bold text-btn-fg transition-colors hover:bg-btn-hover ${
            iconOnly ? 'mx-auto w-[52px]' : 'mx-3 w-[90%]'
          }`}
        >
          {iconOnly ? <Pen className="h-6 w-6" /> : 'Post'}
        </button>
      </nav>

      <div className="mb-2">
        <ProfileTab iconOnly={iconOnly} />
      </div>
    </div>
  );
}
