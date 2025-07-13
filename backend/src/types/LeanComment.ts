import mongoose from 'mongoose';

export interface LeanComment {
  _id: mongoose.Types.ObjectId;
  content: string;
  name: string;
  email?: string; // Optional, not always present
  author: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  parentComment: mongoose.Types.ObjectId | null;
  replies?: LeanComment[];
  createdAt: Date;
  likes: mongoose.Types.ObjectId[];
}
