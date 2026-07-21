import { Router } from 'express';
import { getProfile, toggleFollow } from '../controllers/user-controller';
import { requireAuth, optionalAuth } from '../middleware/require-auth';

const userRoutes = Router();

userRoutes.get('/:id', optionalAuth, getProfile);
userRoutes.post('/follow', requireAuth, toggleFollow);

export default userRoutes;
