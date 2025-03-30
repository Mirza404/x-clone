import mongoose, { Document } from 'mongoose';
import User from './User';

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 380,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
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
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model('Comment', CommentSchema);
