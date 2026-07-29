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
import { writeLimiter } from '../middleware/rate-limit';

const postRoutes = Router();

postRoutes.get('/', allPosts);
postRoutes.get('/:id', getPost);
postRoutes.post('/new', requireAuth, writeLimiter, createPost);
postRoutes.delete('/delete', requireAuth, writeLimiter, deletePost);
postRoutes.patch('/edit', requireAuth, writeLimiter, updatePost);
postRoutes.post('/like', requireAuth, writeLimiter, toggleLike);
postRoutes.get('/getLikes/:id', getLikes);

postRoutes.use('/:postId/comment', commentRoutes);

export default postRoutes;
