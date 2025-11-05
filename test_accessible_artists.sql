-- Test script to simulate getAccessibleArtists function
-- Replace 'simon.hellsing@learnifier.com' with your actual email

-- 1. Get user ID
WITH user_info AS (
    SELECT id FROM user_profiles WHERE email = 'simon.hellsing@learnifier.com'
)

-- 2. Simulate getAccessibleArtists logic
SELECT 
    'Step 1: Direct artist access' as step,
    COUNT(*) as count
FROM access_grants ag, user_info ui
WHERE ag.user_id = ui.id
AND ag.resource_type = 'artist'
AND ag.is_active = true

UNION ALL

SELECT 
    'Step 2: Release access (artists via releases)' as step,
    COUNT(DISTINCT ra.artist_id) as count
FROM access_grants ag, user_info ui
JOIN release_artists ra ON ra.release_id = ag.resource_id
WHERE ag.user_id = ui.id
AND ag.resource_type = 'release'
AND ag.is_active = true

UNION ALL

SELECT 
    'Step 3: Total unique artists accessible' as step,
    COUNT(DISTINCT artist_id) as count
FROM (
    -- Direct artist access
    SELECT ag.resource_id as artist_id
    FROM access_grants ag, user_info ui
    WHERE ag.user_id = ui.id
    AND ag.resource_type = 'artist'
    AND ag.is_active = true
    
    UNION
    
    -- Artist access via releases
    SELECT ra.artist_id
    FROM access_grants ag, user_info ui
    JOIN release_artists ra ON ra.release_id = ag.resource_id
    WHERE ag.user_id = ui.id
    AND ag.resource_type = 'release'
    AND ag.is_active = true
) accessible_artists;

-- 3. Show the actual accessible artists
WITH user_info AS (
    SELECT id FROM user_profiles WHERE email = 'simon.hellsing@learnifier.com'
),
accessible_artist_ids AS (
    -- Direct artist access
    SELECT ag.resource_id as artist_id
    FROM access_grants ag, user_info ui
    WHERE ag.user_id = ui.id
    AND ag.resource_type = 'artist'
    AND ag.is_active = true
    
    UNION
    
    -- Artist access via releases
    SELECT ra.artist_id
    FROM access_grants ag, user_info ui
    JOIN release_artists ra ON ra.release_id = ag.resource_id
    WHERE ag.user_id = ui.id
    AND ag.resource_type = 'release'
    AND ag.is_active = true
)
SELECT 
    a.id,
    a.name,
    a.region,
    a.country
FROM artists a
JOIN accessible_artist_ids aai ON aai.artist_id = a.id
ORDER BY a.name;
