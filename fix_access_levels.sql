-- =====================================================
-- FIX ACCESS LEVELS FOR EXISTING USERS
-- =====================================================

-- Update access levels for the current user to 'full'
UPDATE access_grants 
SET access_level = 'full'::access_level
WHERE email = 'simonhellsing@gmail.com';

-- Update access levels for any other users to 'edit' (or whatever level you prefer)
UPDATE access_grants 
SET access_level = 'edit'::access_level
WHERE email != 'simonhellsing@gmail.com' 
AND access_level = 'view';

-- Show the updated access grants
SELECT 
  resource_type,
  resource_id,
  email,
  access_level,
  is_active
FROM access_grants 
ORDER BY email, resource_type, resource_id;
