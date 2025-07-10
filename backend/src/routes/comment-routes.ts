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
const commentRoutes = Router({ mergeParams: true });

commentRoutes.get('/', findCommentsByPost);
commentRoutes.get('/:commentId', findCommentById);
commentRoutes.post('/new', createComment);
commentRoutes.patch('/edit/:commentId', updateComment);
commentRoutes.patch('/delete/:commentId', deleteComment);
commentRoutes.post('/like', toggleLike);

export default commentRoutes;
