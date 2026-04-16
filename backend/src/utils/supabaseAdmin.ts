import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey || supabaseServiceRoleKey === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
  console.warn('⚠️ [Supabase Admin] Missing or placeholder SERVICE_ROLE_KEY. Database administrative tasks will fail.');
}

/**
 * 🛠️ Supabase Admin Client
 * Uses the Service Role Key to bypass RLS.
 * Use ONLY for backend administrative tasks (like saving encrypted API keys).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
