import { Request, Response } from 'express';
import type {} from '../types/express';
import { MediaValidationError, mediaService } from '../services/media-service';

function handleMediaError(
  error: unknown,
  response: Response,
  operation: string
): void {
  if (error instanceof MediaValidationError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(`Error ${operation}:`, error);
  response.status(500).json({ message: 'Internal server error' });
}

export async function createUploadSignature(
  request: Request,
  response: Response
): Promise<void> {
  const userId = request.userId;
  if (!userId) {
    response.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    const signature = await mediaService.createUploadSignature(userId);
    response.status(200).json(signature);
  } catch (error) {
    handleMediaError(error, response, 'creating an upload signature');
  }
}

export async function completeUpload(
  request: Request,
  response: Response
): Promise<void> {
  const userId = request.userId;
  if (!userId) {
    response.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    const result = await mediaService.completeUpload(userId, request.body);
    response.status(200).json(result);
  } catch (error) {
    handleMediaError(error, response, 'completing an image upload');
  }
}
