import mongoose from 'mongoose';

const LikeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetType: {
    type: String,
    enum: ['post', 'comment'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

LikeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
LikeSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model('Like', LikeSchema);
