import mongoose from 'mongoose';
import { Request, Response } from 'express';
import type {} from '../types/express';
import Conversation, { participantsKey } from '../models/Conversation';
import Message from '../models/Message';
import { getUsersCollection } from '../db/connection';
import { hasObjectId, toObjectId } from '../utils/object-id';

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
  return conversation.participants.find((p) => p.toString() !== userId);
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
      const unreadEntry = conversation.unread.find(
        (entry) => entry.user.toString() === userId
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

    const recipient = await getUsersCollection().findOne(
      { _id: toObjectId(recipientId) },
      { projection: { _id: 1 } }
    );

    if (!recipient) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const key = participantsKey(userId, recipientId);

    let conversation = await Conversation.findOne({ participantsKey: key });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [toObjectId(userId), toObjectId(recipientId)],
        participantsKey: key,
        lastMessageAt: new Date(),
        unread: [
          { user: toObjectId(userId), count: 0 },
          { user: toObjectId(recipientId), count: 0 },
        ],
      });
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

    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversation: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalMessages = await Message.countDocuments({ conversation: id });
    const totalPages = Math.ceil(totalMessages / limit);

    res.status(200).json({
      messages: messages.reverse(),
      totalPages,
      currentPage: page,
    });
  } catch (e) {
    console.error('Error fetching messages:', e);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
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
      { conversation: id, readBy: { $ne: toObjectId(userId) } },
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
  markConversationRead,
};
