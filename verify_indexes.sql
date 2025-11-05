-- Verify Performance Indexes
-- Run this in Supabase SQL Editor to check if indexes are applied

-- Check access_grants indexes (most critical)
SELECT 
  'access_grants' as table_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'access_grants'
ORDER BY indexname;

-- Check release_artists indexes
SELECT 
  'release_artists' as table_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'release_artists'
ORDER BY indexname;

-- Check deliverables indexes
SELECT 
  'deliverables' as table_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'deliverables'
ORDER BY indexname;

-- Check deliverable_files indexes
SELECT 
  'deliverable_files' as table_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'deliverable_files'
ORDER BY indexname;

-- Summary: Count indexes per table
SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'access_grants', 
    'release_artists', 
    'deliverables', 
    'deliverable_files',
    'folders',
    'artists',
    'releases',
    'share_links',
    'collections',
    'collection_items',
    'user_profiles',
    'notifications'
  )
GROUP BY tablename
ORDER BY tablename;

-- Expected results:
-- access_grants: Should have at least 4 indexes (idx_access_grants_user_resource, idx_access_grants_resource, idx_access_grants_email, idx_access_grants_user_active)
-- release_artists: Should have 2 indexes
-- deliverables: Should have 2 indexes
-- deliverable_files: Should have 2 indexes
-- Other tables: Should have 1-2 indexes each

