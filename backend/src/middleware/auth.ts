import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import '../types'; // Import expanded Request types

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Auth Service] ERROR: SUPABASE_URL or SUPABASE_ANON_KEY missing in backend .env');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 🔒 Production-Grade Auth Middleware
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches the verified user to the request object.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized: Missing or malformed Authorization header' 
      });
    }

    const token = authHeader.split(' ')[1];

    /**
     * Verify the token with Supabase. 
     * This ensures the token is valid, not expired, and the user hasn't been banned/deleted.
     */
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.warn(`[Auth Service] Unauthorized attempt: ${error?.message || 'User not found'}`);
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid or expired token' 
      });
    }

    // Attach user to request for use in rate limiting and downstream routes
    req.user = user;
    
    next();
  } catch (error: any) {
    console.error('[Auth Service] Internal authentication error:', error.message);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
