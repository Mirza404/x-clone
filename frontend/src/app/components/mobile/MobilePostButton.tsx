'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import MobileNewPost from './MobileNewPost';

export default function MobilePostButton() {
  const [showNewPost, setShowNewPost] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleClick = () => {
    if (!session) {
      router.push('/api/auth/signin');
      return;
    }
    setShowNewPost(true);
  };

  return (
    <>
      {/* Only show on mobile devices */}
      <button
        onClick={handleClick}
        className="fixed right-4 bottom-20 md:hidden bg-[#1d9bf0] text-white rounded-full p-3 shadow-lg z-40"
        aria-label="Create new post"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </button>

      {showNewPost && <MobileNewPost onClose={() => setShowNewPost(false)} />}
    </>
  );
}
