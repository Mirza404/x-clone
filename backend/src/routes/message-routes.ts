import { Router } from 'express';
import {
  listConversations,
  createConversation,
  getConversationMessages,
  sendMessage,
  markConversationRead,
} from '../controllers/message-controller';
import { requireAuth } from '../middleware/require-auth';
import { writeLimiter } from '../middleware/rate-limit';

const messageRoutes = Router();

messageRoutes.get('/conversations', requireAuth, listConversations);
messageRoutes.post(
  '/conversations',
  requireAuth,
  writeLimiter,
  createConversation
);
messageRoutes.get(
  '/conversations/:id/messages',
  requireAuth,
  getConversationMessages
);
messageRoutes.post(
  '/conversations/:id/messages',
  requireAuth,
  writeLimiter,
  sendMessage
);
messageRoutes.patch(
  '/conversations/:id/read',
  requireAuth,
  writeLimiter,
  markConversationRead
);

export default messageRoutes;
