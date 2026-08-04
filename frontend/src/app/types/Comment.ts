export interface Comment {
  id: string;
  author: string;
  content: string;
  images: string[];
  likes: string[];
  name: string;
  postId: string;
  parentComment: string | null;
  replies: Comment[];
  createdAt: Date;
  authorImage: string;
}
