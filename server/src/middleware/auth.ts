import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In development fallback, ensure default user is ADMIN
      if (config.nodeEnv === 'development') {
        const defaultAdmin = await prisma.user.findFirst({
          where: { role: 'ADMIN' },
        });
        if (defaultAdmin) {
          req.user = {
            id: defaultAdmin.id,
            email: defaultAdmin.email,
            name: defaultAdmin.name,
            role: defaultAdmin.role,
          };
          next();
          return;
        }
      }
      res.status(401).json({ error: 'Authentication required. Please log in as an administrator.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User account not found or deactivated.' });
      return;
    }

    // Strict Admin-only enforcement across the entire platform
    if (user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied: This platform can be accessed and managed by administrators only.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Administrative privileges required.' });
    return;
  }
  next();
}
