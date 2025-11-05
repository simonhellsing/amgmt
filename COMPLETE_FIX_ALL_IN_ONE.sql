-- =====================================================
-- COMPLETE FIX - ALL IN ONE
-- =====================================================
-- This fixes the organizations RLS issue completely
-- Run this entire script in your Supabase SQL Editor

-- ============================================
-- PART 1: GRANT TABLE PERMISSIONS
-- ============================================
-- This is crucial! RLS policies don't work without table permissions

GRANT ALL ON organizations TO authenticated;
GRANT ALL ON access_grants TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- PART 2: DROP ALL EXISTING POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view organizations with access" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Allow users to create organizations" ON organizations;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON organizations;
DROP POLICY IF EXISTS "allow_authenticated_select" ON organizations;
DROP POLICY IF EXISTS "allow_admin_update" ON organizations;
DROP POLICY IF EXISTS "allow_admin_delete" ON organizations;
DROP POLICY IF EXISTS "allow_insert" ON organizations;
DROP POLICY IF EXISTS "allow_select" ON organizations;
DROP POLICY IF EXISTS "allow_update" ON organizations;
DROP POLICY IF EXISTS "allow_delete" ON organizations;

-- ============================================
-- PART 3: CREATE SIMPLE, WORKING POLICIES
-- ============================================

-- Allow any authenticated user to INSERT
CREATE POLICY "organizations_insert_policy"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to SELECT organizations they have access to
CREATE POLICY "organizations_select_policy"
  ON organizations
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
CREATE POLICY "organizations_update_policy"
  ON organizations
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
  );

-- Allow users with full access to DELETE
CREATE POLICY "organizations_delete_policy"
  ON organizations
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

-- ============================================
-- PART 4: CREATE AUTO-GRANT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION grant_org_creator_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_email TEXT;
  creator_id UUID;
BEGIN
  -- Get the current user
  creator_id := auth.uid();
  
  -- Get their email from auth.users
  SELECT email INTO creator_email
  FROM auth.users
  WHERE id = creator_id;

  -- If we couldn't get the email, try user_profiles
  IF creator_email IS NULL THEN
    SELECT email INTO creator_email
    FROM user_profiles
    WHERE id = creator_id;
  END IF;

  -- Grant full access to the creator
  IF creator_id IS NOT NULL AND creator_email IS NOT NULL THEN
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
      creator_id,
      creator_email,
      'full',
      creator_id,
      NOW(),
      NOW(),
      true
    )
    ON CONFLICT (resource_type, resource_id, email) 
    DO UPDATE SET
      is_active = true,
      access_level = 'full';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the insert
    RAISE WARNING 'Failed to grant creator access: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS organization_creator_access_trigger ON organizations;
DROP TRIGGER IF EXISTS org_creator_access ON organizations;
DROP TRIGGER IF EXISTS organization_creator_access_grant ON organizations;

CREATE TRIGGER organization_auto_grant_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION grant_org_creator_access();

-- ============================================
-- PART 5: VERIFY EVERYTHING
-- ============================================

SELECT '========================================' as "VERIFICATION";

SELECT 
  'Table Permissions:' as check,
  COUNT(*) || ' permissions granted' as status
FROM information_schema.table_privileges
WHERE table_name = 'organizations'
  AND grantee = 'authenticated';

SELECT 
  'RLS Policies:' as check,
  COUNT(*) || ' policies active' as status
FROM pg_policies 
WHERE tablename = 'organizations';

SELECT 
  'Trigger:' as check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE event_object_table = 'organizations'
      AND trigger_name LIKE '%grant%'
    )
    THEN '✅ Active'
    ELSE '❌ Missing'
  END as status;

SELECT '========================================' as "RESULT";
SELECT '✅ COMPLETE! Try creating an organization now.' as status;

