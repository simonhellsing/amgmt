-- =====================================================
-- CREATE USER_PROFILES TABLE
-- =====================================================

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone_number TEXT,
  location TEXT,
  avatar_url TEXT,
  layout_preference TEXT DEFAULT 'simple' CHECK (layout_preference IN ('simple', 'complex')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment to explain the layout_preference field
COMMENT ON COLUMN user_profiles.layout_preference IS 'User preference for interface layout: simple (minimal navigation) or complex (full sidebar navigation)';

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;

-- Policy: Allow the service role (used by triggers) to insert profiles
CREATE POLICY "Service role can insert profiles" ON user_profiles
  FOR INSERT
  WITH CHECK (true); -- Service role can insert any profile

-- Policy: Users can insert their own profile on signup (for direct inserts from app)
CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Allow users to view other user profiles (for collaboration features)
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Create a function to automatically create user_profiles on signup
-- This version has better error handling and SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into user_profiles with proper NULL handling
  INSERT INTO public.user_profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    avatar_url,
    phone_number,
    location,
    layout_preference
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'location',
    COALESCE(NEW.raw_user_meta_data->>'layout_preference', 'simple')
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth.users insert
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions to the authenticated and anon roles
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;

-- Verify the setup
SELECT 'User profiles table setup complete!' as status;

-- Show trigger information
SELECT 
  'Trigger created successfully!' as info,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Show RLS policies
SELECT 'User profiles table RLS policies:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_profiles';

