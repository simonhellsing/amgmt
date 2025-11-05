-- Fix existing access grants by setting user_id for the admin user
-- Replace 'simonhellsing@gmail.com' with your actual email

-- 1. Show current state of access_grants
SELECT 'Total access grants:' as info, COUNT(*) as count FROM access_grants;
SELECT 'Access grants with null user_id:' as info, COUNT(*) as count FROM access_grants WHERE user_id IS NULL;
SELECT 'Access grants with valid user_id:' as info, COUNT(*) as count FROM access_grants WHERE user_id IS NOT NULL;

-- 2. Show sample of grants with null user_id
SELECT 
    id,
    user_id,
    resource_type,
    resource_id,
    access_level,
    granted_by,
    granted_at,
    accepted_at,
    is_active
FROM access_grants 
WHERE user_id IS NULL
LIMIT 10;

-- 3. Get admin user ID
SELECT 'Admin user ID:' as info, id as user_id 
FROM user_profiles 
WHERE email = 'simonhellsing@gmail.com';

-- 4. Update existing grants to assign them to the admin user
DO $$
DECLARE
    admin_user_id UUID;
    grants_updated INTEGER := 0;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id 
    FROM user_profiles 
    WHERE email = 'simonhellsing@gmail.com';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user not found. Please update the email address.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found admin user: %', admin_user_id;
    
    -- Update all grants with null user_id to belong to the admin user
    UPDATE access_grants 
    SET 
        user_id = admin_user_id,
        accepted_at = NOW()
    WHERE user_id IS NULL;
    
    GET DIAGNOSTICS grants_updated = ROW_COUNT;
    
    RAISE NOTICE 'Updated % access grants to belong to admin user', grants_updated;
END $$;

-- 5. Verify the updates
SELECT 'Total access grants after update:' as info, COUNT(*) as count FROM access_grants;
SELECT 'Access grants with null user_id after update:' as info, COUNT(*) as count FROM access_grants WHERE user_id IS NULL;
SELECT 'Access grants for admin user:' as info, COUNT(*) as count 
FROM access_grants 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'simonhellsing@gmail.com');

-- 6. Show all grants for the admin user
SELECT 
    resource_type,
    resource_id,
    access_level,
    granted_at,
    is_active
FROM access_grants 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'simonhellsing@gmail.com')
ORDER BY resource_type, access_level;

-- 7. Show artist access specifically
SELECT 
    a.name as artist_name,
    ag.access_level,
    ag.granted_at
FROM access_grants ag
JOIN artists a ON a.id = ag.resource_id
WHERE ag.user_id = (SELECT id FROM user_profiles WHERE email = 'simon.hellsing@learnifier.com')
AND ag.resource_type = 'artist'
AND ag.is_active = true
ORDER BY a.name;
