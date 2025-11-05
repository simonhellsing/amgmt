-- Debug script to check admin user access
-- Replace 'simon.hellsing@learnifier.com' with your actual email

-- 1. Check if the user exists
SELECT 'User exists:' as check_type, COUNT(*) as result 
FROM user_profiles 
WHERE email = 'simon.hellsing@learnifier.com';

-- 2. Show user details
SELECT id, email, first_name, last_name 
FROM user_profiles 
WHERE email = 'simon.hellsing@learnifier.com';

-- 3. Check all access grants for this user
SELECT 
    resource_type,
    resource_id,
    access_level,
    is_active,
    granted_at
FROM access_grants 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'simon.hellsing@learnifier.com')
ORDER BY resource_type, access_level;

-- 4. Count access grants by type
SELECT 
    resource_type,
    access_level,
    COUNT(*) as count
FROM access_grants 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'simon.hellsing@learnifier.com')
AND is_active = true
GROUP BY resource_type, access_level
ORDER BY resource_type, access_level;

-- 5. Check if there are any artists in the system
SELECT 'Total artists:' as check_type, COUNT(*) as count FROM artists;

-- 6. Show all artists
SELECT id, name, region, country FROM artists ORDER BY name;

-- 7. Check if there are any releases in the system
SELECT 'Total releases:' as check_type, COUNT(*) as count FROM releases;

-- 8. Show all releases
SELECT id, title, status FROM releases ORDER BY created_at DESC;

-- 9. Check release_artists relationships
SELECT 'Total release_artists:' as check_type, COUNT(*) as count FROM release_artists;

-- 10. Show release_artists relationships
SELECT 
    ra.release_id,
    r.title as release_title,
    ra.artist_id,
    a.name as artist_name
FROM release_artists ra
JOIN releases r ON r.id = ra.release_id
JOIN artists a ON a.id = ra.artist_id
ORDER BY r.title, a.name;
