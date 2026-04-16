import { Router, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { decrypt } from '../utils/encryption';
import { supabaseAdmin } from '../utils/supabaseAdmin';

dotenv.config();

const router = Router();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Proxy for Groq Chat Completions with strict BYOK Enforcement
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { model, messages, temperature } = req.body;
  const user = req.user;

  if (!user) return res.status(401).json({ error: 'User context required' });
  if (!messages || !model) return res.status(400).json({ error: 'Missing required parameters' });

  try {
    // 1. FETCH & VALIDATE PERSONAL API PROFILE (Using ADMIN to bypass RLS/Auth Context)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_api_profiles')
      .select('groq_api_key, is_connected')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.is_connected || !profile?.groq_api_key) {
      return res.status(403).json({ 
        error: 'API_NOT_CONNECTED',
        message: 'Please connect your personal Groq API key to use this feature.' 
      });
    }

    // 2. DECRYPT THE USER'S KEY
    let decryptedKey: string;
    try {
      decryptedKey = decrypt(profile.groq_api_key);
    } catch (e) {
      console.error('[BYOK Error]: Decryption failed for user', user.id);
      return res.status(500).json({ error: 'ENCRYPTION_ERROR', message: 'Secure key retrieval failed.' });
    }

    // 3. EXECUTE GROQ REQUEST
    try {
      const response = await axios.post(
        GROQ_API_URL,
        { model, messages, temperature: temperature ?? 0.7 },
        { headers: { Authorization: `Bearer ${decryptedKey}`, 'Content-Type': 'application/json' } }
      );

      res.json(response.data);

    } catch (error: any) {
      const status = error.response?.status;
      
      if (status === 401) {
        return res.status(401).json({ 
          error: 'INVALID_API_KEY',
          message: 'Your Groq API key is invalid or has expired. Please update it in Settings.' 
        });
      }

      console.error('[AI Request Failure]:', error.response?.data || error.message);
      res.status(503).json({ 
        error: 'AI_SERVICE_UNAVAILABLE',
        message: 'The AI provider is currently unreachable. Please check your key quota or try again later.' 
      });
    }

  } catch (error: any) {
    console.error('[AI Route Error]:', error.message);
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
  }
});

export default router;

export default router;
