import type { Server } from 'socket.io';
import type mongoose from 'mongoose';
import { equalsObjectId } from '../utils/object-id';

interface MessageConversation {
  participants: mongoose.Types.ObjectId[];
}

function emitNewMessage(
  io: Server,
  senderId: string,
  message: unknown,
  conversation: MessageConversation
): void {
  const eventPayload = { message, conversation };
  io.to(`user:${senderId}`).emit('message:new', eventPayload);

  const recipient = conversation.participants.find(
    (participant) => !equalsObjectId(participant, senderId)
  );
  if (recipient) {
    io.to(`user:${recipient.toString()}`).emit('message:new', eventPayload);
  }
}

export { emitNewMessage };
