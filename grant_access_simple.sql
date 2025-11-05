-- Simple script to grant access to all existing artists
-- Replace 'simon.hellsing@learnifier.com' with your actual email

-- 1. Show what artists exist
SELECT 'Existing artists:' as info, COUNT(*) as count FROM artists;
SELECT id, name FROM artists ORDER BY name;

-- 2. Get admin user ID
SELECT 'Admin user ID:' as info, id as user_id 
FROM user_profiles 
WHERE email = 'simon.hellsing@learnifier.com';

-- 3. Grant access one by one with explicit values
DO $$
DECLARE
    admin_user_id UUID;
    artist_record RECORD;
    grants_created INTEGER := 0;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id 
    FROM user_profiles 
    WHERE email = 'simon.hellsing@learnifier.com';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user not found. Please update the email address.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found admin user: %', admin_user_id;
    
    -- Grant full access to all existing artists
    FOR artist_record IN SELECT id, name FROM artists LOOP
        -- Check if access already exists
        IF NOT EXISTS (
            SELECT 1 FROM access_grants 
            WHERE user_id = admin_user_id 
            AND resource_type = 'artist' 
            AND resource_id = artist_record.id
        ) THEN
            -- Grant full access with explicit values
            BEGIN
                INSERT INTO access_grants (
                    user_id, 
                    resource_type, 
                    resource_id, 
                    access_level, 
                    is_active, 
                    granted_by, 
                    granted_at, 
                    accepted_at,
                    invited_at,
                    expires_at,
                    revoked_at
                ) VALUES (
                    admin_user_id,
                    'artist',
                    artist_record.id,
                    'full',
                    true,
                    admin_user_id,
                    NOW(),
                    NOW(),
                    NULL,
                    NULL,
                    NULL
                );
                
                grants_created := grants_created + 1;
                RAISE NOTICE 'Granted full access to artist: % (%)', artist_record.name, artist_record.id;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error granting access to artist % (%): %', artist_record.name, artist_record.id, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Access already exists for artist: % (%)', artist_record.name, artist_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Created % new access grants for artists', grants_created;
END $$;

-- 4. Verify the grants were created
SELECT 
    'Total artist access grants for admin:' as info,
    COUNT(*) as count 
FROM access_grants 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'simon.hellsing@learnifier.com')
AND resource_type = 'artist'
AND is_active = true;

-- 5. Show all artist access grants
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
