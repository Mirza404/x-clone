import { Socket } from 'socket.io';
import { verifyToken } from '../middleware/require-auth';

function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth?.token;

  if (typeof token !== 'string') {
    next(new Error('Authentication required'));
    return;
  }

  const userId = verifyToken(token);

  if (!userId) {
    next(new Error('Authentication required'));
    return;
  }

  socket.data.userId = userId;
  next();
}

export { socketAuthMiddleware };
