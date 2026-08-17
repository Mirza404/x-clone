import { Router } from 'express';
import userRoutes from './user-routes';
import postRoutes from './post-routes';
import messageRoutes from './message-routes';
import mediaRoutes from './media-routes';

const appRouter = Router();

appRouter.use('/user', userRoutes);
appRouter.use('/post', postRoutes);
appRouter.use('/message', messageRoutes);
appRouter.use('/media', mediaRoutes);

export default appRouter;
