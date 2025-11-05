-- =====================================================
-- COMPLETE FIX FOR ORGANIZATION RLS ISSUE
-- =====================================================
-- This script fixes the "new row violates row-level security policy" error
-- when creating organizations

-- Step 1: Verify RLS is enabled (should be)
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'organizations';

-- Step 2: Show all current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'organizations';

-- Step 3: DROP ALL EXISTING POLICIES
DROP POLICY IF EXISTS "Users can view organizations with access" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Allow users to create organizations" ON organizations;

-- Step 4: Create SIMPLE, PERMISSIVE policies that WILL work

-- Allow authenticated users to INSERT (create) organizations
CREATE POLICY "allow_authenticated_insert" ON organizations
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to SELECT (view) their organizations
CREATE POLICY "allow_authenticated_select" ON organizations
  FOR SELECT 
  TO authenticated
  USING (
    id IN (
      SELECT resource_id 
      FROM access_grants 
      WHERE resource_type = 'organization'
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- Allow users with full access to UPDATE
CREATE POLICY "allow_admin_update" ON organizations
  FOR UPDATE 
  TO authenticated
  USING (
    id IN (
      SELECT resource_id 
      FROM access_grants 
      WHERE resource_type = 'organization'
      AND user_id = auth.uid()
      AND access_level = 'full'
      AND is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT resource_id 
      FROM access_grants 
      WHERE resource_type = 'organization'
      AND user_id = auth.uid()
      AND access_level = 'full'
      AND is_active = true
    )
  );

-- Allow users with full access to DELETE
CREATE POLICY "allow_admin_delete" ON organizations
  FOR DELETE 
  TO authenticated
  USING (
    id IN (
      SELECT resource_id 
      FROM access_grants 
      WHERE resource_type = 'organization'
      AND user_id = auth.uid()
      AND access_level = 'full'
      AND is_active = true
    )
  );

-- Step 5: Create trigger to auto-grant access to creator
CREATE OR REPLACE FUNCTION grant_creator_organization_access()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_email TEXT;
BEGIN
  -- Get the creator's email from auth.users
  SELECT email INTO creator_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Grant full access to the creator
  INSERT INTO access_grants (
    resource_type,
    resource_id,
    user_id,
    email,
    access_level,
    granted_by,
    granted_at,
    accepted_at,
    is_active
  ) VALUES (
    'organization',
    NEW.id,
    auth.uid(),
    creator_email,
    'full',
    auth.uid(),
    NOW(),
    NOW(),
    true
  )
  ON CONFLICT (resource_type, resource_id, email) 
  DO UPDATE SET
    is_active = true,
    access_level = 'full',
    accepted_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS organization_creator_access_grant ON organizations;

CREATE TRIGGER organization_creator_access_grant
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION grant_creator_organization_access();

-- Step 6: Verify the new policies
SELECT 
  'New policies created:' as status,
  policyname,
  cmd as "Command",
  permissive as "Permissive"
FROM pg_policies 
WHERE tablename = 'organizations'
ORDER BY cmd;

SELECT '✅ Organization RLS policies fixed!' as status;
SELECT '✅ Auto-access trigger created!' as status;
SELECT '➡️  Try creating an organization now - it should work!' as next_step;

