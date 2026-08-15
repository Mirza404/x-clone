'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Button from './Button';
import { useProfileMutations } from '@/app/utils/profileMutations';

interface FollowButtonProps {
  profileId: string;
  isFollowing: boolean;
}

export default function FollowButton({
  profileId,
  isFollowing,
}: FollowButtonProps) {
  const [isHovering, setIsHovering] = useState(false);
  const { status } = useSession();
  const { useToggleFollow } = useProfileMutations();
  const toggleFollow = useToggleFollow(profileId);

  const label = isFollowing
    ? isHovering
      ? 'Unfollow'
      : 'Following'
    : 'Follow';

  return (
    <Button
      variant={isFollowing ? 'secondary-outline' : 'primary-black'}
      size="md"
      className={
        isFollowing && isHovering
          ? 'border-like text-like hover:bg-like-bg'
          : ''
      }
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      disabled={toggleFollow.isPending}
      onClick={() => {
        if (status !== 'authenticated') {
          toast('Sign in to follow');
          return;
        }
        if (toggleFollow.isPending) return;
        toggleFollow.mutate();
      }}
    >
      {label}
    </Button>
  );
}
