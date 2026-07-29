import http from 'http';
import app from './app';
import { disconnectFromDatabase } from './db/connection';
import { initSocket } from './socket';

const PORT = 3001;
const server = http.createServer(app);
const io = initSocket(server);
let shuttingDown = false;

async function shutdown(signal: 'SIGTERM' | 'SIGINT'): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  console.info(`${signal} received; shutting down gracefully.`);
  const forceShutdownTimer = setTimeout(() => {
    console.error('Graceful shutdown timed out; forcing exit.');
    process.exit(1);
  }, 10_000);

  try {
    await new Promise<void>((resolve, reject) => {
      io.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (
          !error ||
          (error as NodeJS.ErrnoException).code === 'ERR_SERVER_NOT_RUNNING'
        ) {
          resolve();
          return;
        }
        reject(error);
      });
    });
    await disconnectFromDatabase();
    clearTimeout(forceShutdownTimer);
    console.info('Graceful shutdown complete.');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceShutdownTimer);
    console.error('Graceful shutdown failed:', error);
    process.exit(1);
  }
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

server.listen(PORT, () => {
  console.info(`Server up on port: ${PORT}`);
});
