'use client';

import { useParams } from 'next/navigation';
import Avatar from '@/app/components/ui/Avatar';
import FollowButton from '@/app/components/ui/FollowButton';
import ProfilePostList from '@/app/components/posts/ProfilePostList';
import EmptyState from '@/app/components/ui/EmptyState';
import CustomToaster from '@/app/components/ui/CustomToaster';
import { toHandle } from '@/app/utils/handle';
import { useProfileMutations } from '@/app/utils/profileMutations';

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { useFetchProfile } = useProfileMutations();
  const { data: profile, isLoading, isError } = useFetchProfile(id);

  if (isLoading) {
    return <div className="animate-pulse p-4 text-muted">Loading profile…</div>;
  }

  if (isError || !profile) {
    return (
      <EmptyState
        title="Profile not found"
        subtitle="This account doesn't exist or was removed."
      />
    );
  }

  const handle = toHandle(profile.name);

  return (
    <div className="flex w-full flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between">
          <Avatar
            src={profile.image}
            alt={`${profile.name ?? 'User'}'s profile`}
            size="lg"
            className="h-20 w-20"
          />
          {!profile.isSelf && (
            <FollowButton profileId={profile.id} isFollowing={profile.isFollowing} />
          )}
        </div>
        <div className="mt-3">
          <h1 className="text-xl font-extrabold text-content">
            {profile.name ?? 'Unknown'}
          </h1>
          {handle && <p className="text-[15px] text-muted">{handle}</p>}
        </div>
        <div className="mt-3 flex gap-4 text-[15px]">
          <span>
            <span className="font-bold text-content">
              {profile.followingCount}
            </span>{' '}
            <span className="text-muted">Following</span>
          </span>
          <span>
            <span className="font-bold text-content">
              {profile.followersCount}
            </span>{' '}
            <span className="text-muted">Followers</span>
          </span>
        </div>
      </div>
      <ProfilePostList authorId={profile.id} />
      <CustomToaster />
    </div>
  );
}
