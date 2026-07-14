'use client';

import { useState } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';

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
      <div className="relative w-[250px] h-[65px] flex items-center bg-black text-white rounded-full p-3">
        <div className="flex items-center w-full gap-3 justify-center">
          <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <button
        type="button"
        className="relative w-[250px] h-[65px] flex items-center justify-center bg-black text-white rounded-full p-3 hover:bg-gray-900 transition-colors cursor-pointer font-medium"
        onClick={handleClick}
      >
        Sign In
      </button>
    );
  }

  return (
    <div
      className="relative w-[250px] h-[65px] flex items-center bg-black text-white rounded-full p-3 hover:bg-gray-900 transition-colors cursor-pointer"
      onMouseEnter={() => setShowSignOutText(true)}
      onMouseLeave={() => setShowSignOutText(false)}
    >
      <button
        className="flex items-center w-full gap-3 text-left"
        onClick={handleClick}
      >
        <img
          className="w-10 h-10 rounded-full"
          src={session?.user?.image ?? '/Logo.png'}
          referrerPolicy="no-referrer"
          alt={session?.user?.name ?? 'Profile'}
        />
        <div className="flex-1 overflow-hidden">
          <span className="block font-medium text-[15px] leading-5 truncate">
            {showSignOutText ? 'Sign Out' : session?.user?.name}
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
