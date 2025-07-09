import { Router } from 'express';
import {
  findCommentById,
  findCommentsByPost,
  editComment,
  deleteComment,
  toggleLike,
  getLikes,
} from '../controllers/comment-controller';
const commentRoutes = Router({ mergeParams: true });

commentRoutes.get('/', findCommentsByPost); 
commentRoutes.get('/:commentId', findCommentById);
commentRoutes.post('/new', editComment);
commentRoutes.patch('/delete/:commentId', deleteComment);
commentRoutes.post('/like', toggleLike);

export default commentRoutes;
