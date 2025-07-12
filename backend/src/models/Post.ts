import mongoose, { Document } from 'mongoose';

const { Types } = mongoose;
const PostSchema = new mongoose.Schema({
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
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 20,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  likes: {
    type: [Types.ObjectId],
    default: [],
  },
  comments: {
    type: [Types.ObjectId],
    ref: 'Comment',
    default: [],
  },
});

PostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model('Post', PostSchema);
