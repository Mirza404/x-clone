export interface Profile {
  id: string;
  name: string | null;
  image: string | null;
  postCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isSelf: boolean;
}
