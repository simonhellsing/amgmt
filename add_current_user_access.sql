-- =====================================================
-- ADD CURRENT USER TO ACCESS GRANTS FOR TESTING
-- =====================================================

-- First, let's temporarily disable RLS
ALTER TABLE access_grants DISABLE ROW LEVEL SECURITY;

-- Add the current user (simonhellsing@gmail.com) to all existing releases
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
  '273f9d2d-2045-4104-ba0b-681fae5803b2', -- Your user ID from the console
  'simonhellsing@gmail.com',
  'full'::access_level,
  '273f9d2d-2045-4104-ba0b-681fae5803b2',
  NOW(),
  NOW(),
  NOW(),
  true
FROM releases r
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag 
  WHERE ag.resource_type = 'release' 
  AND ag.resource_id = r.id 
  AND ag.email = 'simonhellsing@gmail.com'
);

-- Add the current user to all existing artists
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
  'artist'::resource_type,
  a.id,
  '273f9d2d-2045-4104-ba0b-681fae5803b2',
  'simonhellsing@gmail.com',
  'full'::access_level,
  '273f9d2d-2045-4104-ba0b-681fae5803b2',
  NOW(),
  NOW(),
  NOW(),
  true
FROM artists a
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag 
  WHERE ag.resource_type = 'artist' 
  AND ag.resource_id = a.id 
  AND ag.email = 'simonhellsing@gmail.com'
);

-- Re-enable RLS
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;

-- Show what we added
SELECT 
  resource_type,
  resource_id,
  email,
  access_level,
  is_active
FROM access_grants 
WHERE email = 'simonhellsing@gmail.com'
ORDER BY resource_type, resource_id;
