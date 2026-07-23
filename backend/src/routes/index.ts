import { Router } from 'express';
import userRoutes from './user-routes';
import postRoutes from './post-routes';
import messageRoutes from './message-routes';

const appRouter = Router();

appRouter.use('/user', userRoutes);
appRouter.use('/post', postRoutes);
appRouter.use('/message', messageRoutes);

export default appRouter;
