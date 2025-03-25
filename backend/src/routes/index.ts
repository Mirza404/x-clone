import { Router } from 'express';
import userRoutes from './user-routes';
import postRoutes from './post-routes';
import commentRoutes from './comment-routes';

const appRouter = Router();

appRouter.use('/user', userRoutes);
appRouter.use('/post', postRoutes);
// appRouter.use('/post/:postId/comment', commentRoutes);

export default appRouter;
