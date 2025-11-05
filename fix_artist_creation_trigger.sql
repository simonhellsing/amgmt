-- =====================================================
-- FIX ARTIST CREATION TRIGGER
-- Update the auto-grant trigger to include email
-- =====================================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS auto_grant_admin_access_trigger ON artists;
DROP FUNCTION IF EXISTS auto_grant_admin_access();

-- Recreate the function with email support
CREATE OR REPLACE FUNCTION auto_grant_admin_access()
RETURNS TRIGGER AS $$
DECLARE
    admin_record RECORD;
BEGIN
    -- Loop through all admin users and grant them access to this artist
    FOR admin_record IN 
        SELECT DISTINCT 
            ag.user_id,
            up.email
        FROM access_grants ag
        JOIN user_profiles up ON up.id = ag.user_id
        WHERE ag.access_level = 'full' 
        AND ag.is_active = true
        AND ag.resource_type IN ('artist', 'release', 'organization')
    LOOP
        -- Check if access already exists
        IF NOT EXISTS (
            SELECT 1 FROM access_grants 
            WHERE user_id = admin_record.user_id 
            AND resource_type = 'artist' 
            AND resource_id = NEW.id
        ) THEN
            -- Grant full access to the artist
            INSERT INTO access_grants (
                user_id, 
                email,
                resource_type, 
                resource_id, 
                access_level, 
                is_active, 
                granted_by, 
                granted_at, 
                invited_at,
                accepted_at
            ) VALUES (
                admin_record.user_id,
                admin_record.email,
                'artist',
                NEW.id,
                'full',
                true,
                admin_record.user_id,
                NOW(),
                NOW(),
                NOW()
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER auto_grant_admin_access_trigger
    AFTER INSERT ON artists
    FOR EACH ROW
    EXECUTE FUNCTION auto_grant_admin_access();

-- Verify the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'artists'
AND trigger_name = 'auto_grant_admin_access_trigger';

SELECT '✓ Trigger updated successfully! Try creating an artist now.' as result;

