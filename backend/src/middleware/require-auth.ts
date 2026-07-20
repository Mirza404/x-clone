import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import type {} from '../types/express';

interface BackendTokenPayload {
  sub: string;
}

function getSecret(): string {
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) {
    throw new Error('BACKEND_JWT_SECRET is not set');
  }
  return secret;
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getSecret(), {
      issuer: 'x-clone-frontend',
      audience: 'x-clone-backend',
    }) as BackendTokenPayload;
    return payload.sub;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const userId = token ? verifyToken(token) : null;

  if (!userId) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  req.userId = userId;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  const userId = token ? verifyToken(token) : null;

  if (userId) {
    req.userId = userId;
  }

  next();
}
