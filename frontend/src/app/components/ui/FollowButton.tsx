'use client';

import { useState } from 'react';
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
      onClick={() => toggleFollow.mutate()}
    >
      {label}
    </Button>
  );
}
