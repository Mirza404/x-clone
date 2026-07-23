import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import Conversation, { participantsKey } from '../models/Conversation';
import Message from '../models/Message';
import { hasObjectId, toObjectId } from '../utils/object-id';

interface MessageSendPayload {
  conversationId?: string;
  recipientId?: string;
  content?: string;
}

interface MessageSendAck {
  ok: boolean;
  message?: unknown;
  conversation?: unknown;
  error?: string;
}

function isMessageSendPayload(value: unknown): value is MessageSendPayload {
  return typeof value === 'object' && value !== null;
}

async function resolveConversation(payload: MessageSendPayload, userId: string) {
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
    const key = participantsKey(userId, payload.recipientId);
    const existing = await Conversation.findOne({ participantsKey: key });
    if (existing) {
      return existing;
    }

    return Conversation.create({
      participants: [toObjectId(userId), toObjectId(payload.recipientId)],
      participantsKey: key,
      lastMessageAt: new Date(),
      unread: [
        { user: toObjectId(userId), count: 0 },
        { user: toObjectId(payload.recipientId), count: 0 },
      ],
    });
  }

  return null;
}

async function handleMessageSend(
  io: Server,
  userId: string,
  payload: MessageSendPayload,
  content: string,
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

    const message = await Message.create({
      conversation: conversation._id,
      sender: toObjectId(userId),
      content,
    });

    const recipient = conversation.participants.find(
      (participant) => participant.toString() !== userId
    );

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = message.createdAt;

    if (recipient) {
      const unreadEntry = conversation.unread.find(
        (entry) => entry.user.toString() === recipient.toString()
      );
      if (unreadEntry) {
        unreadEntry.count += 1;
      } else {
        conversation.unread.push({ user: recipient, count: 1 });
      }
    }

    await conversation.save();

    const eventPayload = { message, conversation };
    io.to(`user:${userId}`).emit('message:new', eventPayload);
    if (recipient) {
      io.to(`user:${recipient.toString()}`).emit('message:new', eventPayload);
    }

    respond({ ok: true, message, conversation });
  } catch (e) {
    console.error('Error handling message:send:', e);
    respond({ ok: false, error: 'Internal server error' });
  }
}

function registerMessageHandlers(io: Server, socket: Socket): void {
  socket.on(
    'message:send',
    (raw: unknown, ack?: (response: MessageSendAck) => void) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      const userId = socket.data.userId as string;
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

      void handleMessageSend(io, userId, payload, content, respond);
    }
  );
}

export { registerMessageHandlers };
