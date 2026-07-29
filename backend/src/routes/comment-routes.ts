import { Router } from 'express';
import {
  findCommentById,
  findCommentsByPost,
  createComment,
  deleteComment,
  toggleLike,
  getLikes,
  updateComment,
} from '../controllers/comment-controller';
import { requireAuth } from '../middleware/require-auth';
import { writeLimiter } from '../middleware/rate-limit';
const commentRoutes = Router({ mergeParams: true });

commentRoutes.get('/', findCommentsByPost);
commentRoutes.get('/:commentId', findCommentById);
commentRoutes.post('/new', requireAuth, writeLimiter, createComment);
commentRoutes.patch(
  '/edit/:commentId',
  requireAuth,
  writeLimiter,
  updateComment
);
commentRoutes.patch(
  '/delete/:commentId',
  requireAuth,
  writeLimiter,
  deleteComment
);
commentRoutes.post('/like', requireAuth, writeLimiter, toggleLike);
commentRoutes.get('/getLikes/:id', getLikes);

export default commentRoutes;
