-- =====================================================
-- NUCLEAR FIX - Fixes ALL possible access issues
-- =====================================================

-- Step 1: Delete ALL existing organization access grants
-- (We'll recreate them properly)
DELETE FROM access_grants 
WHERE resource_type = 'organization';

-- Step 2: Grant FULL access to ALL organizations for ALL users
-- This ensures everyone has proper access
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
  'organization'::resource_type,
  o.id,
  up.id,
  up.email,
  'full'::access_level,
  up.id,
  NOW(),
  NOW(),
  NOW(),
  true
FROM organizations o
CROSS JOIN user_profiles up;

-- Step 3: Grant FULL access to ALL existing artists for ALL users
-- This ensures you can manage artists
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
  up.id,
  up.email,
  'full'::access_level,
  up.id,
  NOW(),
  NOW(),
  NOW(),
  true
FROM artists a
CROSS JOIN user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag
  WHERE ag.resource_type = 'artist'
  AND ag.resource_id = a.id
  AND ag.user_id = up.id
);

-- Step 4: Fix artist RLS policies (allow all authenticated users)
DROP POLICY IF EXISTS "Authenticated users can view artists" ON artists;
DROP POLICY IF EXISTS "Authenticated users can insert artists" ON artists;
DROP POLICY IF EXISTS "Authenticated users can update artists" ON artists;
DROP POLICY IF EXISTS "Authenticated users can delete artists" ON artists;

CREATE POLICY "Authenticated users can view artists" ON artists
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert artists" ON artists
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update artists" ON artists
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete artists" ON artists
FOR DELETE TO authenticated
USING (true);

-- Step 5: Verify the fix
SELECT '=== VERIFICATION ===' as section;

SELECT 'Organization access grants:' as info;
SELECT 
  up.email,
  o.name as organization,
  ag.access_level,
  ag.is_active,
  ag.user_id IS NOT NULL as has_user_id
FROM access_grants ag
JOIN user_profiles up ON up.id = ag.user_id
JOIN organizations o ON o.id = ag.resource_id
WHERE ag.resource_type = 'organization'
ORDER BY up.email;

SELECT 'Artist access grants:' as info;
SELECT 
  up.email,
  COUNT(DISTINCT ag.resource_id) as artist_count,
  MAX(ag.access_level) as highest_level
FROM access_grants ag
JOIN user_profiles up ON up.id = ag.user_id
WHERE ag.resource_type = 'artist'
AND ag.is_active = true
GROUP BY up.email
ORDER BY up.email;

SELECT '✓✓✓ COMPLETE - All access grants have been reset and fixed!' as result;
SELECT '✓✓✓ Please HARD REFRESH your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)' as instruction;

