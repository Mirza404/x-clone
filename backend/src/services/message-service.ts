import mongoose from 'mongoose';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { toObjectId, equalsObjectId } from '../utils/object-id';

interface MongoDuplicateKeyError {
  code: number;
}

function isDuplicateKeyError(error: unknown): error is MongoDuplicateKeyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as MongoDuplicateKeyError).code === 11000
  );
}

interface ConversationLike {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
}

interface CreateMessageParams {
  conversation: ConversationLike;
  senderId: string;
  content: string;
  images: string[];
  clientId: string;
}

interface CreateMessageResult {
  message: mongoose.Document;
  conversation: ConversationLike;
  created: boolean;
}

// Shared by the socket `message:send` handler and the REST send endpoint, so
// a retried send is a no-op on either path: `Message` has a sparse unique
// index on (sender, clientId), so a retry with the same clientId returns the
// message created by the first attempt instead of creating a duplicate.
async function createMessageIdempotent({
  conversation,
  senderId,
  content,
  images,
  clientId,
}: CreateMessageParams): Promise<CreateMessageResult> {
  const senderObjectId = toObjectId(senderId);

  const existing = await Message.findOne({ sender: senderObjectId, clientId });
  if (existing) {
    return { message: existing, conversation, created: false };
  }

  let message;
  try {
    message = await Message.create({
      conversation: conversation._id,
      sender: senderObjectId,
      content,
      images,
      clientId,
    });
  } catch (e) {
    if (isDuplicateKeyError(e)) {
      const retried = await Message.findOne({
        sender: senderObjectId,
        clientId,
      });
      if (retried) {
        return { message: retried, conversation, created: false };
      }
    }
    throw e;
  }

  const recipient = conversation.participants.find(
    (participant) => !equalsObjectId(participant, senderId)
  );

  const summaryUpdate = {
    $set: { lastMessage: message._id, lastMessageAt: message.createdAt },
  };

  let updatedConversation = await Conversation.findOneAndUpdate(
    recipient
      ? { _id: conversation._id, 'unread.user': recipient }
      : { _id: conversation._id },
    recipient
      ? { ...summaryUpdate, $inc: { 'unread.$[elem].count': 1 } }
      : summaryUpdate,
    recipient
      ? { new: true, arrayFilters: [{ 'elem.user': recipient }] }
      : { new: true }
  );

  if (!updatedConversation && recipient) {
    updatedConversation = await Conversation.findByIdAndUpdate(
      conversation._id,
      { ...summaryUpdate, $push: { unread: { user: recipient, count: 1 } } },
      { new: true }
    );
  }

  if (!updatedConversation) {
    throw new Error('Conversation disappeared during message send');
  }

  return { message, conversation: updatedConversation, created: true };
}

export { createMessageIdempotent };
export type { CreateMessageParams, CreateMessageResult };
