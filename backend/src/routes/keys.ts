import { Router, Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { encrypt } from '../utils/encryption';
import { supabaseAdmin } from '../utils/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const router = Router();
const GROQ_VERIFY_URL = 'https://api.groq.com/openai/v1/models';

// Public client for health/status checks
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 📡 status: Checks the connection state of the user's personal API profile.
 */
router.get('/status', async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Auth required' });

  try {
    const { data, error } = await supabase
      .from('user_api_profiles')
      .select('is_connected')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ isConnected: data?.is_connected || false });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch API status' });
  }
});

/**
 * 🔐 connect-api: Verifies, encrypts, and persists a user's personal API key.
 * Standardized endpoint as per Senior Engineer requirements.
 */
router.post('/connect-api', async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    const user = req.user;

    // 🕵️ DEBUG LOGGING: Senior Requirement
    console.log("USER:", user);
    console.log("BODY:", req.body);

    // 1. Authorization Guard
    if (!user) {
      console.error('[Connect API] Unauthorized: Missing user context');
      return res.status(401).json({ 
        success: false, 
        error: 'UNAUTHORIZED',
        message: 'Valid Supabase session required' 
      });
    }

    // 2. Payload Validation
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'MISSING_PAYLOAD',
        message: 'apiKey is required in the request body' 
      });
    }

    // 3. Groq Validation Flow
    console.log(`[Connect API] Verifying key with Groq for user ${user.id}...`);
    try {
      await axios.get(GROQ_VERIFY_URL, {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
        timeout: 8000 // 8s timeout to avoid blocking UI indefinitely
      });
    } catch (groqError: any) {
      const groqMsg = groqError.response?.data?.error?.message || groqError.message;
      console.warn(`[Connect API] Validation Failed: ${groqMsg}`);
      return res.status(400).json({ 
        success: false, 
        error: 'INVALID_API_KEY',
        message: 'The provided Groq API key is invalid or has expired.'
      });
    }

    // 4. Secure Encryption
    const encryptedKey = encrypt(apiKey.trim());

    // 5. Atomic Supabase Upsert (using ADMIN to ensure success)
    console.log(`[Connect API] Persisting encrypted authority for user ${user.id}...`);
    const { error: dbError } = await supabaseAdmin
      .from('user_api_profiles')
      .upsert({ 
        user_id: user.id,
        groq_api_key: encryptedKey,
        is_connected: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (dbError) {
      console.error('[Connect API] Storage Failure:', dbError.message);
      return res.status(500).json({ 
        success: false, 
        error: 'DATABASE_ERROR',
        message: 'Failed to persist API profile. Check Service Role settings.'
      });
    }

    // 6. Final Success Response
    console.log(`[Connect API] 🚀 Success: Authority established for ${user.id}`);
    res.json({ 
      success: true, 
      message: 'API authority connected and securely encrypted.' 
    });

  } catch (error: any) {
    console.error("API CONNECT ERROR:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "INTERNAL_SERVER_ERROR"
    });
  }
});

// Alias for backwards compatibility if needed during migration
router.post('/verify-groq', async (req: Request, res: Response) => {
  // Redirect to standardized handler
  (req.body as any).apiKey = req.body.key;
  return (router as any).handle(req, res); // This is a bit hacky, better to just call logic or keep separate
});

/**
 * 🗑️ disconnect-groq: Removes the personal key profile.
 */
router.post('/disconnect-api', async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Auth required' });

  try {
    const { error } = await supabaseAdmin
      .from('user_api_profiles')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    res.json({ success: true, message: 'API authority removed' });

  } catch (error: any) {
    res.status(500).json({ error: 'Failed to disconnect API profile' });
  }
});

export default router;
