import mongoose from 'mongoose';
import { Request, Response } from 'express';
import type { Server } from 'socket.io';
import type {} from '../types/express';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { getUsersCollection } from '../db/connection';
import { hasObjectId, toObjectId, equalsObjectId } from '../utils/object-id';
import { getOrCreateConversation } from '../services/conversation-service';
import { createMessageIdempotent } from '../services/message-service';
import { MediaValidationError, mediaService } from '../services/media-service';
import { emitNewMessage } from '../socket/message-events';

function isParticipant(
  conversation: { participants: mongoose.Types.ObjectId[] },
  userId: string
): boolean {
  return hasObjectId(conversation.participants, userId);
}

function otherParticipant(
  conversation: { participants: mongoose.Types.ObjectId[] },
  userId: string
): mongoose.Types.ObjectId | undefined {
  return conversation.participants.find((p) => !equalsObjectId(p, userId));
}

interface MessageCursor {
  createdAt: Date;
  id: mongoose.Types.ObjectId;
}

const DEFAULT_MESSAGE_LIMIT = 20;
const MAX_MESSAGE_LIMIT = 100;

function parseMessageLimit(value: unknown): number | null {
  if (value === undefined) {
    return DEFAULT_MESSAGE_LIMIT;
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const limit = Number(value);
  if (!Number.isSafeInteger(limit)) {
    return null;
  }

  return Math.min(limit, MAX_MESSAGE_LIMIT);
}

function parseMessageCursor(value: unknown): MessageCursor | null {
  if (typeof value !== 'string') {
    return null;
  }

  const separator = value.lastIndexOf('_');
  const createdAt = new Date(value.slice(0, separator));
  const id = value.slice(separator + 1);

  if (
    separator === -1 ||
    Number.isNaN(createdAt.getTime()) ||
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    return null;
  }

  return { createdAt, id: toObjectId(id) };
}

function serializeMessageCursor(message: {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
}): string {
  return `${message.createdAt.toISOString()}_${message._id.toString()}`;
}

async function listConversations(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const conversations = await Conversation.find({
      participants: toObjectId(userId),
    })
      .sort({ lastMessageAt: -1 })
      .populate('lastMessage')
      .lean();

    const otherIds = conversations
      .map((conversation) => otherParticipant(conversation, userId))
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));

    const users = await getUsersCollection()
      .find({ _id: { $in: otherIds } })
      .project({ name: 1, image: 1 })
      .toArray();

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    const result = conversations.map((conversation) => {
      const other = otherParticipant(conversation, userId);
      const otherUser = other ? userMap.get(other.toString()) : null;
      const unreadEntry = conversation.unread.find((entry) =>
        equalsObjectId(entry.user, userId)
      );

      return {
        id: conversation._id,
        participant: other
          ? {
              id: other,
              name: otherUser?.name ?? null,
              image: otherUser?.image ?? null,
            }
          : null,
        lastMessage: conversation.lastMessage ?? null,
        lastMessageAt: conversation.lastMessageAt,
        unreadCount: unreadEntry?.count ?? 0,
      };
    });

    res.status(200).json({ conversations: result });
  } catch (e) {
    console.error('Error listing conversations:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}

async function createConversation(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const { recipientId } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      res.status(400).json({ message: 'Valid recipientId is required' });
      return;
    }

    if (recipientId === userId) {
      res.status(400).json({ message: 'You cannot message yourself' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const conversation = await getOrCreateConversation(userId, recipientId);

    if (!conversation) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ conversation });
  } catch (e) {
    console.error('Error creating conversation:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

async function getConversationMessages(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Valid conversation id is required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const conversation = await Conversation.findById(id)
      .select('participants')
      .lean();

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    if (!isParticipant(conversation, userId)) {
      res
        .status(403)
        .json({ message: 'You are not a participant of this conversation' });
      return;
    }

    const limit = parseMessageLimit(req.query.limit);
    if (limit === null) {
      res.status(400).json({ message: 'Invalid message limit' });
      return;
    }

    const cursor = parseMessageCursor(req.query.cursor);

    if (req.query.cursor !== undefined && !cursor) {
      res.status(400).json({ message: 'Invalid message cursor' });
      return;
    }

    const messageFilter: Record<string, unknown> = { conversation: id };
    if (cursor) {
      messageFilter.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
      ];
    }

    const messages = await Message.find(messageFilter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = messages.length > limit;
    const pageMessages = hasMore ? messages.slice(0, limit) : messages;
    const oldestMessage = pageMessages[pageMessages.length - 1];

    res.status(200).json({
      messages: pageMessages
        .reverse()
        .map((message) => ({ ...message, images: message.images ?? [] })),
      nextCursor:
        hasMore && oldestMessage ? serializeMessageCursor(oldestMessage) : null,
    });
  } catch (e) {
    console.error('Error fetching messages:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}

const MAX_CLIENT_ID_LENGTH = 100;

// REST fallback for sending a message when the socket path can't be used
// (disconnected, or an ack that timed out). It shares the same idempotent
// create path as the socket handler, keyed on `clientId`, so a message
// already persisted by a socket send that actually reached the server is
// returned as-is instead of being duplicated by the REST retry.
async function sendMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Valid conversation id is required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const content =
      typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 2000) {
      res
        .status(400)
        .json({ message: 'Content must be between 1 and 2000 characters' });
      return;
    }

    const clientId = req.body.clientId;
    if (
      typeof clientId !== 'string' ||
      clientId.length === 0 ||
      clientId.length > MAX_CLIENT_ID_LENGTH
    ) {
      res.status(400).json({ message: 'Valid clientId is required' });
      return;
    }

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    if (!isParticipant(conversation, userId)) {
      res
        .status(403)
        .json({ message: 'You are not a participant of this conversation' });
      return;
    }

    let images: string[];
    try {
      images = await mediaService.assertOwnedImageUrls(
        userId,
        req.body.images ?? []
      );
    } catch (e) {
      if (e instanceof MediaValidationError) {
        res.status(400).json({ message: e.message });
        return;
      }
      throw e;
    }

    const {
      message,
      conversation: updatedConversation,
      created,
    } = await createMessageIdempotent({
      conversation,
      senderId: userId,
      content,
      images,
      clientId,
    });

    if (created) {
      const io = req.app.get('socketIo') as Server | undefined;
      if (io) {
        emitNewMessage(io, userId, message, updatedConversation);
      }
    }

    res.status(200).json({ message, conversation: updatedConversation });
  } catch (e) {
    console.error('Error sending message:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

async function markConversationRead(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Valid conversation id is required' });
      return;
    }

    if (mongoose.connection.readyState !== 1) {
      res.status(500).json({ message: 'Database not connected' });
      return;
    }

    const conversation = await Conversation.findById(id).select('participants');

    if (!conversation) {
      res.status(404).json({ message: 'Conversation not found' });
      return;
    }

    if (!isParticipant(conversation, userId)) {
      res
        .status(403)
        .json({ message: 'You are not a participant of this conversation' });
      return;
    }

    await Conversation.updateOne(
      { _id: id, 'unread.user': toObjectId(userId) },
      { $set: { 'unread.$.count': 0 } }
    );

    await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: toObjectId(userId) },
        readBy: { $ne: toObjectId(userId) },
      },
      { $addToSet: { readBy: toObjectId(userId) } }
    );

    res.status(200).json({ message: 'Conversation marked as read' });
  } catch (e) {
    console.error('Error marking conversation as read:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export {
  listConversations,
  createConversation,
  getConversationMessages,
  sendMessage,
  markConversationRead,
};
