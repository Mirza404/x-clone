import mongoose from 'mongoose';

const { Types } = mongoose;
const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 380,
  },
  postId: {
    type: Types.ObjectId,
    ref: 'Post',
    required: true,
  },

  parentComment: {
    type: Types.ObjectId,
    ref: 'Comment',
    default: null,
    required: false,
  },
  replies: [{ type: Types.ObjectId, ref: 'Comment' }], // this is your hybrid addition
  author: {
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    minLength: 1,
    maxLength: 20,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  likes: {
    type: [Types.ObjectId],
    ref: 'User',
    default: [],
  },
});

export default mongoose.model('Comment', CommentSchema);
