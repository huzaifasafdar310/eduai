import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to authenticate requests from the mobile app
 * using a shared secret token.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const appToken = process.env.APP_TOKEN;
  const requestToken = req.headers['x-app-token'];

  if (!appToken) {
    console.error('[Auth Service] ERROR: APP_TOKEN is not set in environment variables.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (requestToken !== appToken) {
    console.warn(`[Auth Service] Unauthorized access attempt from IP: ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing App Token' });
  }

  next();
};
