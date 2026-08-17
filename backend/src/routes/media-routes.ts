import { Router } from 'express';
import {
  completeUpload,
  createUploadSignature,
} from '../controllers/media-controller';
import { requireAuth } from '../middleware/require-auth';
import { mediaLimiter } from '../middleware/rate-limit';

const mediaRoutes = Router();

mediaRoutes.post(
  '/signature',
  requireAuth,
  mediaLimiter,
  createUploadSignature
);
mediaRoutes.post('/complete', requireAuth, mediaLimiter, completeUpload);

export default mediaRoutes;
