import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 380,
  },
  images: {
    type: [String],
    maxLength: 8,
    minLength: 0,
    required: false,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    minLength: 1,
    maxLength: 100,
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null,
  },
  replies: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Comment',
    default: [],
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  likes: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
});

CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ parentComment: 1 });

export default mongoose.model('Comment', CommentSchema);
