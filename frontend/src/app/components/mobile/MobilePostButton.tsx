'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
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
        className="fixed bottom-20 right-4 z-40 rounded-full bg-x-blue p-4 text-white shadow-lg transition-colors hover:bg-x-blue-hover md:hidden"
        aria-label="Create new post"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </button>

      {showNewPost && <MobileNewPost onClose={() => setShowNewPost(false)} />}
    </>
  );
}
