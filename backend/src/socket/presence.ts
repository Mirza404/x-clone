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

export { addSocket, removeSocket, isOnline };
export type { PresenceTransition };
