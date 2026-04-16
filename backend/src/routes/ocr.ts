import { Router, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const router = Router();
const OCR_SPACE_API_URL = 'https://api.ocr.space/parse/image';

// Initialize Supabase for credit enforcement
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Proxy for OCR.Space extraction with Credit Enforcement
 */
router.post('/extract', async (req: Request, res: Response) => {
  const { base64Data, mimeType } = req.body;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'User context required' });
  }

  if (!base64Data) {
    return res.status(400).json({ error: 'Missing base64Data' });
  }

  // 1.5 PAYLOAD SIZE VALIDATION (Guard against crash/timeout)
  // 2MB base64 string is roughly 2.7 million characters
  const MAX_PAYLOAD_SIZE = 2 * 1024 * 1024; // 2MB
  if (base64Data.length > MAX_PAYLOAD_SIZE * 1.37) { // 1.37 factor for base64 overhead
    console.warn(`[OCR Route] Rejected payload of size: ${base64Data.length} chars`);
    return res.status(413).json({ 
      error: 'Image data too large. Please compress before sending.' 
    });
  }

  try {
    // 1. ATOMIC CREDIT DECREMENT
    const { data: newCreditCount, error: creditError } = await supabase
      .rpc('decrement_credits', { user_id: user.id });

    if (creditError || newCreditCount === null) {
      return res.status(402).json({ 
        error: 'Insufficient credits. OCR processing costs 1 credit.' 
      });
    }

    // 2. CALL EXTERNAL API
    const formData = new URLSearchParams();
    formData.append('base64Image', `data:${mimeType};base64,${base64Data}`);
    formData.append('apikey', process.env.OCR_API_KEY || '');
    formData.append('isOverlayRequired', 'false');
    formData.append('filetype', 'JPG');

    const response = await axios.post(OCR_SPACE_API_URL, formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const result = response.data;
    const text = result.ParsedResults?.[0]?.ParsedText || '';

    // Return text + updated credit count
    res.json({
      text,
      remainingCredits: newCreditCount
    });

  } catch (error: any) {
    console.error('[OCR Route] Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'OCR extraction failed. Internal proxy error.',
    });
  }
});

export default router;
