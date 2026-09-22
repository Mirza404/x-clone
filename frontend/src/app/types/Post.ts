export interface Post {
  id: string;
  author: string;
  content: string;
  likeCount: number;
  isLiked: boolean;
  images: [string];
  name: string;
  createdAt: Date;
  authorImage: string;
}
