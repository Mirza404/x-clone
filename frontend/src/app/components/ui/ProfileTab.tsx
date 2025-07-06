'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

const ProfileTab = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative w-[250px] h-[65px] flex items-center bg-black text-white rounded-full p-3 hover:bg-gray-900 transition-colors">
      <button
        className="flex items-center w-full gap-3 text-left"
        onClick={() => signOut()}
      >
        <img
          className="w-10 h-10 rounded-full"
          src={session?.user?.image ?? '/Logo.png'}
          referrerPolicy="no-referrer"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
        <div className="flex-1 overflow-hidden">
          <span className="block font-medium text-[15px] leading-5 truncate">
            {session?.user?.name}
          </span>
        </div>
        <span className="flex items-center justify-center w-8">
          <svg
            className="w-5 h-5 text-gray-400"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              d="M6 12h.01m6 0h.01m5.99 0h.01"
            />
          </svg>
        </span>
      </button>
    </div>
  );
};

export default ProfileTab;
