import http from 'http';
import app from './app';
import { initSocket } from './socket';

const PORT = 3001;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.info(`Server up on port: ${PORT}`);
});
