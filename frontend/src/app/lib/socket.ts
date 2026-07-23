import { io, Socket } from 'socket.io-client';
import { getBackendToken } from '../utils/apiClient';

let socket: Socket | null = null;

function createSocket(): Socket {
  return io(process.env.NEXT_PUBLIC_SERVER_URL, {
    autoConnect: false,
    auth: async (callback) => {
      const cached = await getBackendToken();
      callback({ token: cached?.token });
    },
  });
}

// Socket.IO calls `auth` again on every (re)connect attempt, so a torn-down
// socket always re-proves identity with a fresh token instead of a stale one.
function getSocket(): Socket {
  if (!socket) {
    socket = createSocket();
  }
  return socket;
}

export { getSocket };
