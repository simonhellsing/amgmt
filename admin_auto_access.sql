-- Set up automatic admin access to all artists
-- This creates a system where admin users automatically get access to all current and future artists

-- 1. Create a function to identify admin users
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE(user_id UUID) AS $$
BEGIN
    -- Return all users who have 'full' access to any artist or release
    -- This identifies users who are admins
    RETURN QUERY
    SELECT DISTINCT ag.user_id
    FROM access_grants ag
    WHERE ag.access_level = 'full' 
    AND ag.is_active = true
    AND ag.resource_type IN ('artist', 'release');
END;
$$ LANGUAGE plpgsql;

-- 2. Create a function to grant admin access to a specific artist
CREATE OR REPLACE FUNCTION grant_admin_access_to_artist(artist_id UUID)
RETURNS void AS $$
DECLARE
    admin_user UUID;
BEGIN
    -- Loop through all admin users and grant them access to this artist
    FOR admin_user IN SELECT * FROM get_admin_users() LOOP
        -- Check if access already exists
        IF NOT EXISTS (
            SELECT 1 FROM access_grants 
            WHERE user_id = admin_user 
            AND resource_type = 'artist' 
            AND resource_id = artist_id
        ) THEN
            -- Grant full access to the artist
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
                admin_user,
                'artist',
                artist_id,
                'full',
                true,
                admin_user, -- Self-granted
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'Granted admin access to artist % for user %', artist_id, admin_user;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger function that runs when a new artist is created
CREATE OR REPLACE FUNCTION auto_grant_admin_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Grant admin access to the newly created artist
    PERFORM grant_admin_access_to_artist(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger on the artists table
DROP TRIGGER IF EXISTS auto_grant_admin_access_trigger ON artists;
CREATE TRIGGER auto_grant_admin_access_trigger
    AFTER INSERT ON artists
    FOR EACH ROW
    EXECUTE FUNCTION auto_grant_admin_access();

-- 5. Create a function to grant admin access to all existing artists
CREATE OR REPLACE FUNCTION grant_admin_access_to_all_artists()
RETURNS void AS $$
DECLARE
    artist_record RECORD;
BEGIN
    -- Loop through all existing artists
    FOR artist_record IN SELECT id FROM artists LOOP
        PERFORM grant_admin_access_to_artist(artist_record.id);
    END LOOP;
    
    RAISE NOTICE 'Granted admin access to all existing artists';
END;
$$ LANGUAGE plpgsql;

-- 6. Grant admin access to all existing artists
SELECT grant_admin_access_to_all_artists();

-- 7. Verify the setup
SELECT 
    'Total admin users:' as info,
    COUNT(DISTINCT user_id) as count 
FROM get_admin_users();

SELECT 
    'Total artists with admin access:' as info,
    COUNT(DISTINCT resource_id) as count 
FROM access_grants 
WHERE resource_type = 'artist' 
AND access_level = 'full' 
AND is_active = true;

-- 8. Show current admin users and their artist access
SELECT 
    up.email,
    COUNT(ag.resource_id) as artists_with_access
FROM get_admin_users() gau
JOIN user_profiles up ON up.id = gau.user_id
LEFT JOIN access_grants ag ON ag.user_id = gau.user_id 
    AND ag.resource_type = 'artist' 
    AND ag.access_level = 'full' 
    AND ag.is_active = true
GROUP BY up.email
ORDER BY up.email;
