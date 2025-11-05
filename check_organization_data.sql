-- Check what organizations exist and their data
SELECT 
  id,
  name,
  image_url,
  created_at,
  'Organization data:' as info
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- Check access grants for these organizations
SELECT 
  ag.resource_id as org_id,
  o.name as org_name,
  ag.user_id,
  ag.email,
  ag.access_level,
  'Access grants:' as info
FROM access_grants ag
JOIN organizations o ON o.id = ag.resource_id
WHERE ag.resource_type = 'organization'
ORDER BY ag.granted_at DESC
LIMIT 5;

