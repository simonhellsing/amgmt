-- =====================================================
-- FINAL ORGANIZATION RLS FIX
-- =====================================================
-- This will fix the "new row violates row-level security policy" error

-- Step 1: Drop ALL existing policies on organizations
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organizations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON organizations', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 2: Create simple INSERT policy (THIS is what's failing for you)
CREATE POLICY "allow_insert"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 3: Create SELECT policy based on access_grants
CREATE POLICY "allow_select"
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

-- Step 4: Create UPDATE policy for admins
CREATE POLICY "allow_update"
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

-- Step 5: Create DELETE policy for admins
CREATE POLICY "allow_delete"
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

-- Step 6: Create function to auto-grant access to creator
CREATE OR REPLACE FUNCTION auto_grant_org_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Grant access
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
    v_email,
    'full',
    auth.uid(),
    NOW(),
    NOW(),
    true
  )
  ON CONFLICT (resource_type, resource_id, email) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if access grant fails
    RAISE WARNING 'Could not auto-grant access: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS org_creator_access ON organizations;
CREATE TRIGGER org_creator_access
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_grant_org_access();

-- Done!
SELECT '✅ RLS policies fixed - try creating an organization now!' as status;

