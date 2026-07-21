'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthWall from '../../components/ui/AuthWall';

export default function ProfileRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.id) {
      router.replace(`/profile/${session.user.id}`);
    }
  }, [session, router]);

  if (status === 'loading' || session?.user?.id) {
    return <div className="animate-pulse p-4 text-muted">Loading…</div>;
  }

  return <AuthWall />;
}
