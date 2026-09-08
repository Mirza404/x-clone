export interface Comment {
  id: string;
  author: string;
  content: string;
  images: string[];
  likeCount: number;
  isLiked: boolean;
  name: string;
  postId: string;
  parentComment: string | null;
  replies: Comment[];
  createdAt: Date;
  authorImage: string;
}
