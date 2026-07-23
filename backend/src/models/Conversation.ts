import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema({
  participants: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    required: true,
    validate: {
      validator: (value: mongoose.Types.ObjectId[]) => value.length === 2,
      message: 'A conversation must have exactly 2 participants',
    },
  },
  participantsKey: {
    type: String,
    required: true,
    unique: true,
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  unread: {
    type: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        count: { type: Number, default: 0, required: true },
      },
    ],
    default: [],
  },
});

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

function participantsKey(
  a: mongoose.Types.ObjectId | string,
  b: mongoose.Types.ObjectId | string
): string {
  return [a.toString(), b.toString()].sort().join('_');
}

export { participantsKey };
export default mongoose.model('Conversation', ConversationSchema);
