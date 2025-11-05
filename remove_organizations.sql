-- Remove organization references from database
-- This script removes all organization-related data and references

-- 1. Drop RLS policies that depend on organization_id
DROP POLICY IF EXISTS "Read artists by org" ON artists;
DROP POLICY IF EXISTS "Insert artists by org" ON artists;
DROP POLICY IF EXISTS "Update artists by org" ON artists;
DROP POLICY IF EXISTS "Delete artists by org" ON artists;

-- 2. Remove organization_id from artists table
ALTER TABLE artists DROP COLUMN IF EXISTS organization_id;

-- 3. Remove all access grants for organizations (since we're single-tenant)
DELETE FROM access_grants WHERE resource_type = 'organization';

-- 4. Drop the organizations table entirely
DROP TABLE IF EXISTS organizations CASCADE;

-- 5. Update the resource_type enum to remove 'organization'
-- Note: This might require recreating the enum if there are existing references
-- For now, we'll keep it but not use it

-- 6. Clean up any orphaned access grants (grants for resources that no longer exist)
DELETE FROM access_grants 
WHERE resource_type = 'artist' 
AND resource_id NOT IN (SELECT id FROM artists);

DELETE FROM access_grants 
WHERE resource_type = 'release' 
AND resource_id NOT IN (SELECT id FROM releases);

DELETE FROM access_grants 
WHERE resource_type = 'deliverable' 
AND resource_id NOT IN (SELECT id FROM deliverables);

-- 7. Verify the cleanup
SELECT 'Total artists in system:' as check_type, COUNT(*) as count 
FROM artists;

SELECT 'Access grants for organizations:' as check_type, COUNT(*) as count 
FROM access_grants 
WHERE resource_type = 'organization';

SELECT 'Total access grants remaining:' as check_type, COUNT(*) as count 
FROM access_grants;
