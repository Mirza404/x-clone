import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { socketAuthMiddleware } from './auth';
import { registerMessageHandlers } from './handlers';
import { registerTypingHandlers } from './typing';
import {
  addSocket,
  removeSocket,
  broadcastPresenceChange,
  sendCurrentPresenceTo,
} from './presence';

function initSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);

    if (addSocket(userId, socket.id) === 'came-online') {
      void broadcastPresenceChange(io, userId, true);
    }
    void sendCurrentPresenceTo(io, socket.id, userId);

    socket.on('disconnect', () => {
      if (removeSocket(userId, socket.id) === 'went-offline') {
        void broadcastPresenceChange(io, userId, false);
      }
    });
  });

  return io;
}

export { initSocket };
