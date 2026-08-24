import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { hasObjectId, toObjectId, equalsObjectId } from '../utils/object-id';
import { getOrCreateConversation } from '../services/conversation-service';
import { createMessageIdempotent } from '../services/message-service';
import { allow } from './rate-limit';
import { MediaValidationError, mediaService } from '../services/media-service';

interface MessageSendPayload {
  conversationId?: string;
  recipientId?: string;
  content?: string;
  images?: string[];
  clientId?: string;
}

interface MessageSendAck {
  ok: boolean;
  message?: unknown;
  conversation?: unknown;
  error?: string;
}

interface MessageReadPayload {
  conversationId?: string;
}

interface MessageReadAck {
  ok: boolean;
  error?: string;
}

function isMessageSendPayload(value: unknown): value is MessageSendPayload {
  return typeof value === 'object' && value !== null;
}

function isMessageReadPayload(value: unknown): value is MessageReadPayload {
  return typeof value === 'object' && value !== null;
}

async function resolveConversation(
  payload: MessageSendPayload,
  userId: string
) {
  if (
    payload.conversationId &&
    mongoose.Types.ObjectId.isValid(payload.conversationId)
  ) {
    return Conversation.findById(payload.conversationId);
  }

  if (
    payload.recipientId &&
    mongoose.Types.ObjectId.isValid(payload.recipientId) &&
    payload.recipientId !== userId
  ) {
    return getOrCreateConversation(userId, payload.recipientId);
  }

  return null;
}

async function handleMessageSend(
  io: Server,
  userId: string,
  payload: MessageSendPayload,
  content: string,
  images: string[],
  clientId: string,
  respond: (response: MessageSendAck) => void
): Promise<void> {
  try {
    const conversation = await resolveConversation(payload, userId);

    if (!conversation) {
      respond({
        ok: false,
        error: 'Conversation not found or recipient invalid',
      });
      return;
    }

    if (!hasObjectId(conversation.participants, userId)) {
      respond({
        ok: false,
        error: 'You are not a participant of this conversation',
      });
      return;
    }

    const { message, conversation: updatedConversation, created } =
      await createMessageIdempotent({
        conversation,
        senderId: userId,
        content,
        images,
        clientId,
      });

    if (!created) {
      respond({ ok: true, message, conversation: updatedConversation });
      return;
    }

    const recipient = conversation.participants.find(
      (participant) => !equalsObjectId(participant, userId)
    );

    const eventPayload = { message, conversation: updatedConversation };
    io.to(`user:${userId}`).emit('message:new', eventPayload);
    if (recipient) {
      io.to(`user:${recipient.toString()}`).emit('message:new', eventPayload);
    }

    respond({ ok: true, message, conversation: updatedConversation });
  } catch (e) {
    console.error('Error handling message:send:', e);
    respond({ ok: false, error: 'Internal server error' });
  }
}

async function handleMessageRead(
  io: Server,
  userId: string,
  conversationId: string,
  respond: (response: MessageReadAck) => void
): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      respond({ ok: false, error: 'Valid conversationId is required' });
      return;
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      respond({ ok: false, error: 'Conversation not found' });
      return;
    }

    if (!hasObjectId(conversation.participants, userId)) {
      respond({
        ok: false,
        error: 'You are not a participant of this conversation',
      });
      return;
    }

    const unreadEntry = conversation.unread.find((entry) =>
      equalsObjectId(entry.user, userId)
    );
    if (unreadEntry) {
      unreadEntry.count = 0;
      await conversation.save();
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: toObjectId(userId) },
        readBy: { $ne: toObjectId(userId) },
      },
      { $addToSet: { readBy: toObjectId(userId) } }
    );

    const recipient = conversation.participants.find(
      (participant) => !equalsObjectId(participant, userId)
    );

    if (recipient) {
      io.to(`user:${recipient.toString()}`).emit('message:read', {
        conversationId,
        userId,
        readAt: new Date().toISOString(),
      });
    }

    respond({ ok: true });
  } catch (e) {
    console.error('Error handling message:read:', e);
    respond({ ok: false, error: 'Internal server error' });
  }
}

function registerMessageHandlers(io: Server, socket: Socket): void {
  socket.on(
    'message:send',
    async (raw: unknown, ack?: (response: MessageSendAck) => void) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      const userId = socket.data.userId as string;

      if (!allow(`message:send:${socket.id}`)) {
        respond({ ok: false, error: 'Too many messages, slow down' });
        return;
      }

      const payload = isMessageSendPayload(raw) ? raw : {};
      const content =
        typeof payload.content === 'string' ? payload.content.trim() : '';

      if (!content || content.length > 2000) {
        respond({
          ok: false,
          error: 'Content must be between 1 and 2000 characters',
        });
        return;
      }

      if (
        typeof payload.clientId !== 'string' ||
        payload.clientId.length === 0 ||
        payload.clientId.length > 100
      ) {
        respond({ ok: false, error: 'Valid clientId is required' });
        return;
      }

      try {
        const images = await mediaService.assertOwnedImageUrls(
          userId,
          payload.images ?? []
        );
        await handleMessageSend(
          io,
          userId,
          payload,
          content,
          images,
          payload.clientId,
          respond
        );
      } catch (e) {
        if (e instanceof MediaValidationError) {
          respond({ ok: false, error: e.message });
          return;
        }
        console.error('Error validating message images:', e);
        respond({ ok: false, error: 'Internal server error' });
      }
    }
  );

  socket.on(
    'message:read',
    (raw: unknown, ack?: (response: MessageReadAck) => void) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      const userId = socket.data.userId as string;
      const payload = isMessageReadPayload(raw) ? raw : {};

      if (typeof payload.conversationId !== 'string') {
        respond({ ok: false, error: 'Valid conversationId is required' });
        return;
      }

      void handleMessageRead(io, userId, payload.conversationId, respond);
    }
  );
}

export { registerMessageHandlers };
