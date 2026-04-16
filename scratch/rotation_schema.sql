-- ==========================================
-- 🛡️ EDUAI AUTHORITATIVE SCHEMA
-- ==========================================

-- 1. PROFILES: The source of truth for user state
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  credits INT DEFAULT 10 CHECK (credits >= 0),
  language TEXT DEFAULT 'en',
  groq_key TEXT,
  groq_connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- 2. API_KEY_ROTATION: Atomic selection tool
CREATE TABLE IF NOT EXISTS public.api_key_rotation (
  id INT PRIMARY KEY DEFAULT 1,
  current_index INT DEFAULT 0
);

-- Initialize if empty
INSERT INTO public.api_key_rotation (id, current_index) 
SELECT 1, 0 WHERE NOT EXISTS (SELECT 1 FROM public.api_key_rotation);

-- 3. FUNCTION: Atomic Credit Decrement
-- Ensures user has enough balance and updates atomically
CREATE OR REPLACE FUNCTION decrement_credits(user_id UUID)
RETURNS INT AS $$
DECLARE
  new_credits INT;
BEGIN
  UPDATE public.profiles
  SET credits = credits - 1,
      updated_at = timezone('utc'::text, now())
  WHERE id = user_id AND credits > 0
  RETURNING credits INTO new_credits;

  IF NOT FOUND THEN
    -- Check if profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
      RAISE EXCEPTION 'Profile not found';
    ELSE
      RAISE EXCEPTION 'Insufficient credits';
    END IF;
  END IF;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCTION: Atomic Key Rotation
CREATE OR REPLACE FUNCTION get_next_key_index(total_keys INT)
RETURNS INT AS $$
DECLARE
  next_idx INT;
BEGIN
  UPDATE public.api_key_rotation
  SET current_index = (current_index + 1) % total_keys
  WHERE id = 1
  RETURNING current_index INTO next_idx;
  
  RETURN next_idx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
