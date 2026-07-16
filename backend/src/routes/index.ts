import { Router } from 'express';
import userRoutes from './user-routes';
import postRoutes from './post-routes';

const appRouter = Router();

appRouter.use('/user', userRoutes);
appRouter.use('/post', postRoutes);

export default appRouter;
