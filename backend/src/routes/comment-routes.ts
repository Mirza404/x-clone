import { Router } from 'express';
import {
  allComments,
  addComment,
  deleteComment,
} from '../controllers/comment-controller';

const commentRoutes = Router({ mergeParams: true }); // Enable access to parent route params

commentRoutes.get('/', allComments);
commentRoutes.post('/new', addComment);
commentRoutes.patch('/delete/:commentId', deleteComment);

export default commentRoutes;
