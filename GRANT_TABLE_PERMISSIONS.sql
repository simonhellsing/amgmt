-- =====================================================
-- GRANT TABLE PERMISSIONS TO AUTHENTICATED ROLE
-- =====================================================
-- RLS policies don't work if the role doesn't have table permissions!
-- This is likely the root cause of your issue.

-- Grant ALL permissions on organizations table to authenticated users
GRANT ALL ON organizations TO authenticated;

-- Also grant on access_grants (needed for the trigger)
GRANT ALL ON access_grants TO authenticated;

-- Grant usage on sequences (for auto-incrementing IDs if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify grants were applied
SELECT 
  'Organizations table grants:' as info,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'organizations'
  AND grantee = 'authenticated';

SELECT 
  'Access_grants table grants:' as info,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'access_grants'
  AND grantee = 'authenticated';

SELECT '✅ Table permissions granted to authenticated role!' as status;
SELECT '✅ Try creating an organization now!' as next_step;

