import { Router, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RETRIES = 3;

// Initialize keys from environment
const getApiKeys = (): string[] => {
  const individualKeys = [
    process.env.GROQ_API_KEY_1 || '',
    process.env.GROQ_API_KEY_2 || '',
    process.env.GROQ_API_KEY_3 || '',
  ];
  const bulkKeys = (process.env.GROQ_API_KEYS || '').split(',').map(k => k.trim());
  return Array.from(new Set([...individualKeys, ...bulkKeys])).filter(k => k !== '');
};

let apiKeys = getApiKeys();
let currentKeyIndex = 0;

const getNextKey = (): string => {
  if (apiKeys.length === 0) {
    throw new Error('No Groq API keys configured on server.');
  }
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
};

/**
 * Proxy for Groq Chat Completions
 * Body: { model, messages, temperature }
 */
router.post('/chat', async (req: Request, res: Response) => {
  const { model, messages, temperature } = req.body;

  if (!messages || !model) {
    return res.status(400).json({ error: 'Missing required parameters: model, messages' });
  }

  let retries = 0;
  
  const attemptCall = async (): Promise<any> => {
    const key = getNextKey();
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
        console.warn(`[AI Route] Error ${status}. Rotating key and retrying (${retries}/${MAX_RETRIES}) in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return attemptCall();
      }
      throw error;
    }
  };

  try {
    const data = await attemptCall();
    res.json(data);
  } catch (error: any) {
    console.error('[AI Route] Final failure:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error?.message || 'Failed to communicate with AI provider',
    });
  }
});

export default router;
