-- =====================================================
-- FIX: Auto-grant access to organization creator
-- =====================================================
-- This script creates a trigger that automatically grants
-- full access to the user who creates an organization

-- Step 1: Create the function that will grant access
CREATE OR REPLACE FUNCTION grant_organization_creator_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert access grant for the creator
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
  )
  SELECT 
    'organization',
    NEW.id,
    auth.uid(),
    up.email,
    'full',
    auth.uid(),
    NOW(),
    NOW(),
    true
  FROM user_profiles up
  WHERE up.id = auth.uid()
  ON CONFLICT (resource_type, resource_id, email) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop the trigger if it exists
DROP TRIGGER IF EXISTS auto_grant_organization_creator_access ON organizations;

-- Step 3: Create the trigger
CREATE TRIGGER auto_grant_organization_creator_access
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION grant_organization_creator_access();

-- Step 4: Verify
SELECT 
  '✓ Trigger created successfully' as status,
  'New organizations will automatically grant full access to creator' as description;

