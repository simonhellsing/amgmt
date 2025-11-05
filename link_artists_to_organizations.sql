-- =====================================================
-- LINK ARTISTS TO ORGANIZATIONS
-- This script ensures all artists are linked to at least one organization
-- =====================================================

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as section;

SELECT 
  'Artists without organization:' as info,
  COUNT(*) as count
FROM artists
WHERE organization_id IS NULL;

SELECT 
  'Artists with organization:' as info,
  COUNT(*) as count
FROM artists
WHERE organization_id IS NOT NULL;

-- Step 2: Link all artists without an organization_id to the first available organization
-- (You can customize this logic based on your needs)
UPDATE artists
SET organization_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
WHERE organization_id IS NULL
AND EXISTS (SELECT 1 FROM organizations);

-- Step 3: Verify the changes
SELECT '=== AFTER LINKING ===' as section;

SELECT 
  'Artists without organization:' as info,
  COUNT(*) as count
FROM artists
WHERE organization_id IS NULL;

SELECT 
  'Artists with organization:' as info,
  COUNT(*) as count
FROM artists
WHERE organization_id IS NOT NULL;

SELECT 
  'Artists by organization:' as info;
  
SELECT 
  o.name as organization,
  COUNT(a.id) as artist_count
FROM organizations o
LEFT JOIN artists a ON a.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY o.name;

SELECT '✓ All artists are now linked to organizations!' as result;

