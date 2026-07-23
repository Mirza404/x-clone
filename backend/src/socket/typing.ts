import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation';
import { hasObjectId } from '../utils/object-id';

interface TypingPayload {
  conversationId?: string;
}

function isTypingPayload(value: unknown): value is TypingPayload {
  return typeof value === 'object' && value !== null;
}

async function handleTyping(
  io: Server,
  userId: string,
  conversationId: string,
  isTyping: boolean
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return;
  }

  const conversation = await Conversation.findById(conversationId);

  if (!conversation || !hasObjectId(conversation.participants, userId)) {
    return;
  }

  const recipient = conversation.participants.find(
    (participant) => participant.toString() !== userId
  );

  if (recipient) {
    io.to(`user:${recipient.toString()}`).emit('typing', {
      conversationId,
      userId,
      isTyping,
    });
  }
}

function registerTypingHandlers(io: Server, socket: Socket): void {
  socket.on('typing:start', (raw: unknown) => {
    const userId = socket.data.userId as string;
    const payload = isTypingPayload(raw) ? raw : {};
    if (typeof payload.conversationId !== 'string') {
      return;
    }
    void handleTyping(io, userId, payload.conversationId, true);
  });

  socket.on('typing:stop', (raw: unknown) => {
    const userId = socket.data.userId as string;
    const payload = isTypingPayload(raw) ? raw : {};
    if (typeof payload.conversationId !== 'string') {
      return;
    }
    void handleTyping(io, userId, payload.conversationId, false);
  });
}

export { registerTypingHandlers };
