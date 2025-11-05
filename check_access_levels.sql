-- =====================================================
-- CHECK CURRENT ACCESS LEVELS
-- =====================================================

-- Check all access grants for the current release
SELECT 
  id,
  resource_type,
  resource_id,
  email,
  access_level,
  is_active,
  created_at
FROM access_grants 
WHERE resource_type = 'release' 
AND resource_id = '1a4adae0-ecd7-4d35-924c-c8b8a49965d1'
ORDER BY email;
