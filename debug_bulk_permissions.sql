-- Debug script to check bulk permission management data
-- Replace 'simonhellsing@gmail.com' with your actual email

-- 1. Check total access grants in system
SELECT 'Total access grants in system:' as info, COUNT(*) as count FROM access_grants;

-- 2. Check access grants by resource type
SELECT 
    resource_type,
    COUNT(*) as count
FROM access_grants 
WHERE is_active = true
GROUP BY resource_type
ORDER BY resource_type;

-- 3. Check access grants by access level
SELECT 
    access_level,
    COUNT(*) as count
FROM access_grants 
WHERE is_active = true
GROUP BY access_level
ORDER BY access_level;

-- 4. Check your specific access grants
SELECT 
    'Your access grants:' as info,
    COUNT(*) as count
FROM access_grants 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'simonhellsing@gmail.com')
AND is_active = true;

-- 5. Show your detailed access grants
SELECT 
    resource_type,
    resource_id,
    access_level,
    granted_at,
    is_active
FROM access_grants 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'simonhellsing@gmail.com')
AND is_active = true
ORDER BY resource_type, access_level;

-- 6. Check all users with access grants
SELECT 
    up.email,
    COUNT(ag.id) as total_grants,
    COUNT(CASE WHEN ag.access_level = 'full' THEN 1 END) as full_access_grants,
    COUNT(CASE WHEN ag.access_level = 'edit' THEN 1 END) as edit_access_grants,
    COUNT(CASE WHEN ag.access_level = 'view' THEN 1 END) as view_access_grants
FROM user_profiles up
LEFT JOIN access_grants ag ON ag.user_id = up.id AND ag.is_active = true
GROUP BY up.email
ORDER BY up.email;

-- 7. Check artists and their access grants
SELECT 
    a.name as artist_name,
    COUNT(ag.id) as total_grants,
    COUNT(CASE WHEN ag.access_level = 'full' THEN 1 END) as full_access,
    COUNT(CASE WHEN ag.access_level = 'edit' THEN 1 END) as edit_access,
    COUNT(CASE WHEN ag.access_level = 'view' THEN 1 END) as view_access
FROM artists a
LEFT JOIN access_grants ag ON ag.resource_id = a.id AND ag.resource_type = 'artist' AND ag.is_active = true
GROUP BY a.id, a.name
ORDER BY a.name;

-- 8. Check releases and their access grants
SELECT 
    r.title as release_title,
    COUNT(ag.id) as total_grants,
    COUNT(CASE WHEN ag.access_level = 'full' THEN 1 END) as full_access,
    COUNT(CASE WHEN ag.access_level = 'edit' THEN 1 END) as edit_access,
    COUNT(CASE WHEN ag.access_level = 'view' THEN 1 END) as view_access
FROM releases r
LEFT JOIN access_grants ag ON ag.resource_id = r.id AND ag.resource_type = 'release' AND ag.is_active = true
GROUP BY r.id, r.title
ORDER BY r.title;
