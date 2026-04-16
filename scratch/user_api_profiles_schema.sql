-- 🔐 Create specialized API profile table for BYOK architecture
CREATE TABLE IF NOT EXISTS public.user_api_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE UNIQUE NOT NULL,
  groq_api_key TEXT NOT NULL, -- This will store the AES-256-GCM encrypted string
  is_connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 🛡️ Row Level Security (RLS)
ALTER TABLE public.user_api_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see and manage their own API profile
CREATE POLICY "Users can manage their own API profile" 
ON public.user_api_profiles 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 🧹 Migration cleanup: If we have old keys in 'profiles', we can drop those columns later
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS groq_key;
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS groq_connected;
