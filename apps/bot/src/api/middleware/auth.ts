import type { Request, Response, NextFunction } from 'express';
import { config } from '../../lib/config.js';
import { logger } from '../../lib/logger.js';

export interface AuthenticatedRequest extends Request {
  authType?: 'api-key' | 'bearer';
  userId?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Check API key first
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    if (apiKey === config.API_ADMIN_KEY) {
      req.authType = 'api-key';
      return next();
    }
    logger.warn('Invalid API key attempted');
    res.status(401).json({ success: false, error: 'Invalid API key' });
    return;
  }

  // Check Bearer token (will be JWT from dashboard later)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    // For now, accept any bearer token — will validate JWT in Phase 6
    req.authType = 'bearer';
    req.userId = 'dashboard-user';
    return next();
  }

  res.status(401).json({ success: false, error: 'Authentication required. Use X-API-Key or Bearer token.' });
}
