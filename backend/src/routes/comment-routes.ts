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
const commentRoutes = Router({ mergeParams: true });

commentRoutes.get('/', findCommentsByPost);
commentRoutes.get('/:commentId', findCommentById);
commentRoutes.post('/new', requireAuth, createComment);
commentRoutes.patch('/edit/:commentId', requireAuth, updateComment);
commentRoutes.patch('/delete/:commentId', requireAuth, deleteComment);
commentRoutes.post('/like', requireAuth, toggleLike);
commentRoutes.get('/getLikes/:id', getLikes);

export default commentRoutes;
