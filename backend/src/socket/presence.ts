import { Server } from 'socket.io';
import Conversation from '../models/Conversation';
import { toObjectId } from '../utils/object-id';

const socketsByUser = new Map<string, Set<string>>();

type PresenceTransition = 'came-online' | 'went-offline' | 'no-change';

function addSocket(userId: string, socketId: string): PresenceTransition {
  const existing = socketsByUser.get(userId);
  if (!existing) {
    socketsByUser.set(userId, new Set([socketId]));
    return 'came-online';
  }
  existing.add(socketId);
  return 'no-change';
}

function removeSocket(userId: string, socketId: string): PresenceTransition {
  const existing = socketsByUser.get(userId);
  if (!existing) {
    return 'no-change';
  }

  existing.delete(socketId);
  if (existing.size === 0) {
    socketsByUser.delete(userId);
    return 'went-offline';
  }
  return 'no-change';
}

function isOnline(userId: string): boolean {
  return socketsByUser.has(userId);
}

async function getConversationPartnerIds(userId: string): Promise<string[]> {
  const conversations = await Conversation.find({
    participants: toObjectId(userId),
  })
    .select('participants')
    .lean();

  const partnerIds = new Set<string>();
  for (const conversation of conversations) {
    for (const participant of conversation.participants) {
      if (participant.toString() !== userId) {
        partnerIds.add(participant.toString());
      }
    }
  }

  return [...partnerIds];
}

async function broadcastPresenceChange(
  io: Server,
  userId: string,
  online: boolean
): Promise<void> {
  const partnerIds = await getConversationPartnerIds(userId);
  for (const partnerId of partnerIds) {
    io.to(`user:${partnerId}`).emit('presence', { userId, online });
  }
}

async function sendCurrentPresenceTo(
  io: Server,
  socketId: string,
  userId: string
): Promise<void> {
  const partnerIds = await getConversationPartnerIds(userId);
  for (const partnerId of partnerIds) {
    if (isOnline(partnerId)) {
      io.to(socketId).emit('presence', { userId: partnerId, online: true });
    }
  }
}

export {
  addSocket,
  removeSocket,
  isOnline,
  broadcastPresenceChange,
  sendCurrentPresenceTo,
};
export type { PresenceTransition };
