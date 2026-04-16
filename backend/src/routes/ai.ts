import { Router, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const router = Router();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RETRIES = 3;

// Initialize Supabase for credit enforcement and persistent rotation
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 🔑 API Key Procurement Logic
 * Fetches all available keys from environment variables.
 */
const getApiKeys = (): string[] => {
  const individualKeys = [
    process.env.GROQ_API_KEY_1 || '',
    process.env.GROQ_API_KEY_2 || '',
    process.env.GROQ_API_KEY_3 || '',
  ];
  const bulkKeys = (process.env.GROQ_API_KEYS || '').split(',').map(k => k.trim());
  return Array.from(new Set([...individualKeys, ...bulkKeys])).filter(k => k !== '');
};

const apiKeys = getApiKeys();

/**
 * 🔄 Persistent Key Rotation
 * Selected from Supabase DB to ensure synchronization across multiple server instances.
 */
const getNextKey = async (): Promise<string> => {
  if (apiKeys.length === 0) {
    throw new Error('No Groq API keys configured on server.');
  }
  
  // Call atomic RPC function to increment and get current index
  const { data: index, error } = await supabase.rpc('get_next_key_index', { 
    total_keys: apiKeys.length 
  });

  if (error || index === null) {
    console.error('[Rotation Error]: Database sync failed, falling back to random selection', error?.message);
    return apiKeys[Math.floor(Math.random() * apiKeys.length)];
  }

  return apiKeys[index];
};

/**
 * Proxy for Groq Chat Completions with Persistent Key Rotation & Credit Enforcement
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { model, messages, temperature } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'User context required' });
  }

  if (!messages || !model) {
    return res.status(400).json({ error: 'Missing required parameters: model, messages' });
  }

  try {
    // 1. ATOMIC CREDIT DECREMENT
    const { data: newCreditCount, error: creditError } = await supabase
      .rpc('decrement_credits', { user_id: user.id });

    if (creditError || newCreditCount === null) {
      return res.status(402).json({ 
        error: 'Insufficient credits or profile not found. Please top up to continue.' 
      });
    }

    // 2. CALL EXTERNAL API WITH PERSISTENT RETRIES
    let retries = 0;
    
    const attemptCall = async (): Promise<any> => {
      // Rotation now happens inside attemptCall to ensure different keys on retry
      const key = await getNextKey(); 
      try {
        const response = await axios.post(
          GROQ_API_URL,
          { model, messages, temperature: temperature ?? 0.7 },
          { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } }
        );
        return response.data;
      } catch (error: any) {
        const status = error.response?.status;
        const isRateLimit = status === 429;
        const isServerError = status >= 500;

        if ((isRateLimit || isServerError) && retries < MAX_RETRIES) {
          retries++;
          const waitTime = 500 * retries;
          console.warn(`[AI Route] Error ${status}. Rotating key in DB and retrying (${retries}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return attemptCall();
        }
        
        if (retries >= MAX_RETRIES) {
          throw new Error(`All Groq keys exhausted after ${MAX_RETRIES} retries`);
        }
        throw error;
      }
    };

    const data = await attemptCall();
    
    res.json({
      ...data,
      remainingCredits: newCreditCount
    });

  } catch (error: any) {
    console.error('[AI Route] Error:', error.message);
    
    if (error.message.includes('exhausted')) {
      return res.status(503).json({ error: error.message });
    }

    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error?.message || 'Failed to communicate with AI provider',
    });
  }
});

export default router;
