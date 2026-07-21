import { Router } from 'express';
import {
  allPosts,
  createPost,
  deletePost,
  getPost,
  updatePost,
  toggleLike,
  getLikes,
} from '../controllers/post-controller';
import commentRoutes from './comment-routes';
import { requireAuth } from '../middleware/require-auth';

const postRoutes = Router();

postRoutes.get('/', allPosts);
postRoutes.get('/:id', getPost);
postRoutes.post('/new', requireAuth, createPost);
postRoutes.delete('/delete', requireAuth, deletePost);
postRoutes.patch('/edit', requireAuth, updatePost);
postRoutes.post('/like', requireAuth, toggleLike);
postRoutes.get('/getLikes/:id', getLikes);

postRoutes.use('/:postId/comment', commentRoutes);

export default postRoutes;
