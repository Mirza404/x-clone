import { Router } from 'express';
import {
  listConversations,
  createConversation,
  getConversationMessages,
  markConversationRead,
} from '../controllers/message-controller';
import { requireAuth } from '../middleware/require-auth';

const messageRoutes = Router();

messageRoutes.get('/conversations', requireAuth, listConversations);
messageRoutes.post('/conversations', requireAuth, createConversation);
messageRoutes.get(
  '/conversations/:id/messages',
  requireAuth,
  getConversationMessages
);
messageRoutes.patch(
  '/conversations/:id/read',
  requireAuth,
  markConversationRead
);

export default messageRoutes;
