import { Router } from 'express';
import {
  listConversations,
  createConversation,
  getConversationMessages,
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
messageRoutes.patch(
  '/conversations/:id/read',
  requireAuth,
  writeLimiter,
  markConversationRead
);

export default messageRoutes;
