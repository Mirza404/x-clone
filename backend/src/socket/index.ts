import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { socketAuthMiddleware } from './auth';
import { registerMessageHandlers } from './handlers';

function initSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);
    registerMessageHandlers(io, socket);
  });

  return io;
}

export { initSocket };
