-- Grant admin access to all artists and releases for the main admin user
-- Replace 'your-admin-email@example.com' with your actual admin email

-- First, let's see what artists and releases exist
SELECT 'Artists in system:' as info, COUNT(*) as count FROM artists;
SELECT 'Releases in system:' as info, COUNT(*) as count FROM releases;

-- Get the admin user ID (replace with your actual email)
DO $$
DECLARE
    admin_user_id UUID;
    artist_record RECORD;
    release_record RECORD;
BEGIN
    -- Get admin user ID (replace with your actual email)
    SELECT id INTO admin_user_id 
    FROM user_profiles 
    WHERE email = 'simon.hellsing@learnifier.com'; -- Replace with your email
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user not found. Please update the email address in this script.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found admin user: %', admin_user_id;
    
    -- Grant full access to all artists
    FOR artist_record IN SELECT id FROM artists LOOP
        -- Check if access already exists
        IF NOT EXISTS (
            SELECT 1 FROM access_grants 
            WHERE user_id = admin_user_id 
            AND resource_type = 'artist' 
            AND resource_id = artist_record.id
        ) THEN
            INSERT INTO access_grants (
                user_id, 
                resource_type, 
                resource_id, 
                access_level, 
                is_active, 
                granted_by, 
                granted_at, 
                accepted_at
            ) VALUES (
                admin_user_id,
                'artist',
                artist_record.id,
                'full',
                true,
                admin_user_id,
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Granted full access to artist: %', artist_record.id;
        ELSE
            RAISE NOTICE 'Access already exists for artist: %', artist_record.id;
        END IF;
    END LOOP;
    
    -- Grant full access to all releases
    FOR release_record IN SELECT id FROM releases LOOP
        -- Check if access already exists
        IF NOT EXISTS (
            SELECT 1 FROM access_grants 
            WHERE user_id = admin_user_id 
            AND resource_type = 'release' 
            AND resource_id = release_record.id
        ) THEN
            INSERT INTO access_grants (
                user_id, 
                resource_type, 
                resource_id, 
                access_level, 
                is_active, 
                granted_by, 
                granted_at, 
                accepted_at
            ) VALUES (
                admin_user_id,
                'release',
                release_record.id,
                'full',
                true,
                admin_user_id,
                NOW(),
                NOW()
            );
            RAISE NOTICE 'Granted full access to release: %', release_record.id;
        ELSE
            RAISE NOTICE 'Access already exists for release: %', release_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Admin access grant complete!';
END $$;

-- Verify the grants were created
SELECT 
    'Admin access grants:' as info,
    COUNT(*) as count 
FROM access_grants 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'simon.hellsing@learnifier.com');

-- Show all grants for the admin user
SELECT 
    resource_type,
    resource_id,
    access_level,
    is_active
FROM access_grants 
WHERE user_id = (SELECT id FROM user_profiles WHERE email = 'simon.hellsing@learnifier.com')
ORDER BY resource_type, resource_id;
