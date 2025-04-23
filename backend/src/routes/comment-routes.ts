import { Router } from 'express';
import {
  allComments,
  findCommentById,
  findCommentsByPost,
  addComment,
  deleteComment,
  addLike,
  getLikes,
} from '../controllers/comment-controller';
const commentRoutes = Router({ mergeParams: true });

commentRoutes.get('/', findCommentsByPost); 
commentRoutes.get('/:commentId', findCommentById);
commentRoutes.post('/new', addComment);
commentRoutes.patch('/delete/:commentId', deleteComment);
commentRoutes.get('/')
commentRoutes.post('/like', addLike);

export default commentRoutes;
