import { Router } from 'express';
import { getProfile, toggleFollow } from '../controllers/user-controller';
import { requireAuth, optionalAuth } from '../middleware/require-auth';
import { writeLimiter } from '../middleware/rate-limit';

const userRoutes = Router();

userRoutes.get('/:id', optionalAuth, getProfile);
userRoutes.post('/follow', requireAuth, writeLimiter, toggleFollow);

export default userRoutes;
