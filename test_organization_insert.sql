-- =====================================================
-- TEST ORGANIZATION INSERT
-- =====================================================
-- Run this to test if you can create an organization
-- This simulates what the frontend is trying to do

-- First, check your current auth context
SELECT 
  'Your current user ID:' as info,
  auth.uid() as user_id,
  auth.role() as role;

-- Check if you have INSERT permission
SELECT 
  'Can you INSERT into organizations?' as info,
  has_table_privilege('authenticated', 'organizations', 'INSERT') as answer;

-- Try to insert a test organization
INSERT INTO organizations (name, image_url)
VALUES ('Test Organization', null)
RETURNING 
  id, 
  name, 
  'Organization created successfully!' as status;

-- Check if access was auto-granted
SELECT 
  'Was access auto-granted?' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM access_grants 
      WHERE resource_type = 'organization' 
      AND resource_id = (SELECT id FROM organizations WHERE name = 'Test Organization' LIMIT 1)
      AND user_id = auth.uid()
    )
    THEN '✅ YES - trigger worked!'
    ELSE '❌ NO - trigger did not fire'
  END as status;

-- Clean up the test
DELETE FROM organizations WHERE name = 'Test Organization';
SELECT '✅ Test complete - test organization deleted' as cleanup;

