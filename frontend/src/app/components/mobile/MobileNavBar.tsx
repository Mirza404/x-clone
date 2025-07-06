'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNavBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 md:hidden z-40">
      <div className="flex justify-around items-center h-14">
        <Link
          href="/posts"
          className="flex flex-col items-center justify-center w-full"
        >
          <svg
            className={`w-6 h-6 ${pathname === '/posts' ? 'text-white' : 'text-gray-500'}`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="m4 12 8-8 8 8M6 10.5V19a1 1 0 0 0 1 1h3v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h3a1 1 0 0 0 1-1v-8.5"
            />
          </svg>
        </Link>
        <Link
          href="/explore"
          className="flex flex-col items-center justify-center w-full"
        >
          <svg
            className={`w-6 h-6 ${pathname === '/explore' ? 'text-white' : 'text-gray-500'}`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeWidth={2}
              d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
            />
          </svg>
        </Link>
        <Link
          href="/notifications"
          className="flex flex-col items-center justify-center w-full"
        >
          <svg
            className={`w-6 h-6 ${pathname === '/notifications' ? 'text-white' : 'text-gray-500'}`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5.365V3m0 2.365a5.338 5.338 0 0 1 5.133 5.368v1.8c0 2.386 1.867 2.982 1.867 4.175 0 .593 0 1.292-.538 1.292H5.538C5 18 5 17.301 5 16.708c0-1.193 1.867-1.789 1.867-4.175v-1.8A5.338 5.338 0 0 1 12 5.365ZM8.733 18c.094.852.306 1.54.944 2.112a3.48 3.48 0 0 0 4.646 0c.638-.572 1.236-1.26 1.33-2.112h-6.92Z"
            />
          </svg>
        </Link>
        <Link
          href="/messages"
          className="flex flex-col items-center justify-center w-full"
        >
          <svg
            className={`w-6 h-6 ${pathname === '/messages' ? 'text-white' : 'text-gray-500'}`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17h6l3 3v-3h2V9h-2M4 4h11v8H9l-3 3v-3H4V4Z"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}
