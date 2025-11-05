-- =====================================================
-- ADD ACCESS FOR ALL EXISTING USERS
-- =====================================================

-- First, let's temporarily disable RLS
ALTER TABLE access_grants DISABLE ROW LEVEL SECURITY;

-- Get all existing users from auth.users
-- Note: This will only work if you have the service role key or if users are in your user_profiles table
-- Let's try to get users from user_profiles first, then auth.users if available

-- Add access for users from user_profiles table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    -- Add access grants for all users in user_profiles
    INSERT INTO access_grants (
      resource_type,
      resource_id,
      user_id,
      email,
      access_level,
      granted_by,
      granted_at,
      invited_at,
      accepted_at,
      is_active
    )
    SELECT 
      'release'::resource_type,
      r.id,
      up.id,
      up.email,
      'edit'::access_level,
      '273f9d2d-2045-4104-ba0b-681fae5803b2', -- You as the granter
      NOW(),
      NOW(),
      NOW(),
      true
    FROM releases r
    CROSS JOIN user_profiles up
    WHERE up.email != 'simonhellsing@gmail.com' -- Exclude yourself
    AND NOT EXISTS (
      SELECT 1 FROM access_grants ag 
      WHERE ag.resource_type = 'release' 
      AND ag.resource_id = r.id 
      AND ag.email = up.email
    );
  END IF;
END $$;

-- Add access for users from auth.users table (if we can access it)
-- This is a fallback approach - we'll add some common test emails
INSERT INTO access_grants (
  resource_type,
  resource_id,
  user_id,
  email,
  access_level,
  granted_by,
  granted_at,
  invited_at,
  accepted_at,
  is_active
)
SELECT 
  'release'::resource_type,
  r.id,
  NULL, -- Will be set when user accepts
  'test@example.com',
  'edit'::access_level,
  '273f9d2d-2045-4104-ba0b-681fae5803b2',
  NOW(),
  NOW(),
  NULL, -- Not accepted yet
  true
FROM releases r
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag 
  WHERE ag.resource_type = 'release' 
  AND ag.resource_id = r.id 
  AND ag.email = 'test@example.com'
);

-- Add another test user
INSERT INTO access_grants (
  resource_type,
  resource_id,
  user_id,
  email,
  access_level,
  granted_by,
  granted_at,
  invited_at,
  accepted_at,
  is_active
)
SELECT 
  'release'::resource_type,
  r.id,
  NULL,
  'demo@example.com',
  'artist'::access_level,
  '273f9d2d-2045-4104-ba0b-681fae5803b2',
  NOW(),
  NOW(),
  NULL,
  true
FROM releases r
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag 
  WHERE ag.resource_type = 'release' 
  AND ag.resource_id = r.id 
  AND ag.email = 'demo@example.com'
);

-- Re-enable RLS
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;

-- Show all access grants for the current release
SELECT 
  id,
  resource_type,
  resource_id,
  email,
  access_level,
  is_active,
  granted_at
FROM access_grants 
WHERE resource_type = 'release' 
AND resource_id = '1a4adae0-ecd7-4d35-924c-c8b8a49965d1'
ORDER BY email;
