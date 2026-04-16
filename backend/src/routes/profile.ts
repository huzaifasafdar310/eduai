import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * GET /api/user/profile
 * Fetches the user's credits from the persistent profile table.
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Auth context missing' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (error) {
       // If no profile exists yet, create one (fallback)
       if (error.code === 'PGRST116') {
         await supabase.from('profiles').insert({ id: user.id, credits: 10 });
         return res.json({ credits: 10 });
       }
       throw error;
    }

    res.json({ credits: data.credits });
  } catch (error: any) {
    console.error('[Profile Route] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
