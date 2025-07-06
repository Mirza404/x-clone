export interface Post {
  id: string;
  author: string;
  content: string;
  likes: [string];
  images: [string];
  name: string;
  createdAt: Date;
  authorImage: string;
}
