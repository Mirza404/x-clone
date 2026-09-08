import mongoose from 'mongoose';

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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  likeCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  comments: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Comment',
    default: [],
  },
});

PostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model('Post', PostSchema);
