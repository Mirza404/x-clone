import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  clientId: {
    type: String,
    required: false,
  },
  content: {
    type: String,
    required: true,
    minLength: 1,
    maxLength: 2000,
  },
  images: {
    type: [String],
    maxLength: 8,
    minLength: 0,
    required: false,
  },
  readBy: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, clientId: 1 }, { unique: true, sparse: true });

export default mongoose.model('Message', MessageSchema);
