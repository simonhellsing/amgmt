-- =====================================================
-- ADD REAL USERS TO ACCESS GRANTS
-- =====================================================

-- First, let's temporarily disable RLS
ALTER TABLE access_grants DISABLE ROW LEVEL SECURITY;

-- Add simon@simon.se with edit access
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
  'simon@simon.se',
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
  AND ag.email = 'simon@simon.se'
);

-- Add simon.hellsing@learnifier.com with artist access
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
  'simon.hellsing@learnifier.com',
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
  AND ag.email = 'simon.hellsing@learnifier.com'
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
