import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JwtPayload {
  clientId: string;
}

export function requireJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header eksik' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    res.locals.clientId = payload.clientId;
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş JWT' });
  }
}

export function requireUserId(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['user_id'] as string || req.headers['user-id'] as string;
  if (!userId) {
    res.status(400).json({ error: 'user_id header eksik' });
    return;
  }
  res.locals.userId = userId;
  next();
}

export function generateJwt(clientId: string): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '24h') as jwt.SignOptions['expiresIn'];
  return jwt.sign({ clientId }, JWT_SECRET, { expiresIn });
}

export function parseBasicAuth(req: Request): { clientId: string; secret: string } | null {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Basic ')) return null;

  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) return null;

  return {
    clientId: decoded.slice(0, colonIdx),
    secret: decoded.slice(colonIdx + 1),
  };
}
