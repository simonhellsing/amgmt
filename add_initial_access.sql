-- =====================================================
-- ADD INITIAL ACCESS GRANTS FOR EXISTING USERS
-- =====================================================

-- First, let's temporarily disable RLS to add initial data
ALTER TABLE access_grants DISABLE ROW LEVEL SECURITY;
ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
ALTER TABLE share_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens DISABLE ROW LEVEL SECURITY;

-- Add access grants for all existing releases to their creators
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
  r.user_id,
  u.email,
  'full'::access_level,
  r.user_id,
  r.created_at,
  r.created_at,
  r.created_at,
  true
FROM releases r
JOIN auth.users u ON r.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag 
  WHERE ag.resource_type = 'release' 
  AND ag.resource_id = r.id 
  AND ag.user_id = r.user_id
);

-- Add access grants for all existing artists to their creators
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
  a.user_id,
  u.email,
  'full'::access_level,
  a.user_id,
  a.created_at,
  a.created_at,
  a.created_at,
  true
FROM artists a
JOIN auth.users u ON a.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag 
  WHERE ag.resource_type = 'artist' 
  AND ag.resource_id = a.id 
  AND ag.user_id = a.user_id
);

-- Add access grants for all existing deliverables to their creators
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
  'deliverable'::resource_type,
  d.id,
  d.user_id,
  u.email,
  'full'::access_level,
  d.user_id,
  d.created_at,
  d.created_at,
  d.created_at,
  true
FROM deliverables d
JOIN auth.users u ON d.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag 
  WHERE ag.resource_type = 'deliverable' 
  AND ag.resource_id = d.id 
  AND ag.user_id = d.user_id
);

-- Add access grants for all existing folders to their creators
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
  'folder'::resource_type,
  f.id,
  f.user_id,
  u.email,
  'full'::access_level,
  f.user_id,
  f.created_at,
  f.created_at,
  f.created_at,
  true
FROM folders f
JOIN auth.users u ON f.user_id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag 
  WHERE ag.resource_type = 'folder' 
  AND ag.resource_id = f.id 
  AND ag.user_id = f.user_id
);

-- Re-enable RLS
ALTER TABLE access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

-- Show summary
SELECT 
  resource_type,
  COUNT(*) as access_grants_count
FROM access_grants 
GROUP BY resource_type
ORDER BY resource_type;
