import { Router } from 'express';
import {
  allPosts,
  createPost,
  deletePost,
  getPost,
  editPost,
  addLike,
  getLikes,
} from '../controllers/post-controller';
import commentRoutes from './comment-routes';

const postRoutes = Router();

postRoutes.get('/', allPosts);
postRoutes.get('/:id', getPost);
postRoutes.post('/new', createPost);
postRoutes.delete('/delete', deletePost);
postRoutes.patch('/edit', editPost);
postRoutes.post('/like', addLike);
postRoutes.get('/getLikes/:id', getLikes);

postRoutes.use('/:postId/comment', commentRoutes);

export default postRoutes;
