-- =====================================================
-- COMPLETE ORGANIZATION FIX
-- =====================================================

-- Check current enum values
SELECT 'Current enum values:' as info;
SELECT unnest(enum_range(NULL::resource_type)) as current_values;

-- Add 'organization' to the enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'organization' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'resource_type')
    ) THEN
        ALTER TYPE resource_type ADD VALUE 'organization';
        RAISE NOTICE 'Added organization to resource_type enum';
    ELSE
        RAISE NOTICE 'Organization already exists in resource_type enum';
    END IF;
END $$;

-- Verify the enum was updated
SELECT 'Updated enum values:' as info;
SELECT unnest(enum_range(NULL::resource_type)) as updated_values;

-- =====================================================
-- ENSURE PROPER RLS POLICIES
-- =====================================================

-- Drop and recreate organization policies to ensure they're correct
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can delete organizations" ON organizations;

-- Allow all authenticated users to view organizations
CREATE POLICY "Authenticated users can view organizations" ON organizations
FOR SELECT TO authenticated
USING (true);

-- Allow all authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations" ON organizations
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow users with full access to update organizations
CREATE POLICY "Organization admins can update organizations" ON organizations
FOR UPDATE TO authenticated
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

-- Allow users with full access to delete organizations
CREATE POLICY "Organization admins can delete organizations" ON organizations
FOR DELETE TO authenticated
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

-- =====================================================
-- CREATE/UPDATE TRIGGER FOR AUTO ACCESS GRANTS
-- =====================================================

-- Function to grant full access to organization creator
CREATE OR REPLACE FUNCTION grant_organization_creator_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Grant full access to the user who created the organization
  INSERT INTO access_grants (
    resource_type,
    resource_id,
    user_id,
    email,
    access_level,
    granted_by,
    granted_at,
    invited_at,
    accepted_at,
    is_active
  ) VALUES (
    'organization',
    NEW.id,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'full',
    auth.uid(),
    NOW(),
    NOW(),
    NOW(),
    true
  );
  
  RAISE NOTICE 'Granted full access to organization % for user %', NEW.id, auth.uid();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to grant access to organization creator: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS organization_creator_access_trigger ON organizations;

-- Create trigger to auto-grant access when organization is created
CREATE TRIGGER organization_creator_access_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION grant_organization_creator_access();

-- =====================================================
-- GRANT ACCESS TO EXISTING ORGANIZATIONS
-- =====================================================

-- Grant access to existing Sample Records organization
INSERT INTO access_grants (
  resource_type,
  resource_id,
  user_id,
  email,
  access_level,
  granted_by,
  granted_at,
  invited_at,
  accepted_at,
  is_active
) VALUES (
  'organization',
  '550e8400-e29b-41d4-a716-446655440000', -- Sample Records
  '273f9d2d-2045-4104-ba0b-681fae5803b2', -- Your user ID
  'simon@simon.se', -- Replace with your actual email
  'full',
  '273f9d2d-2045-4104-ba0b-681fae5803b2',
  NOW(),
  NOW(),
  NOW(),
  true
) ON CONFLICT DO NOTHING;

-- Grant access to any other existing organizations for the current user
INSERT INTO access_grants (
  resource_type,
  resource_id,
  user_id,
  email,
  access_level,
  granted_by,
  granted_at,
  invited_at,
  accepted_at,
  is_active
)
SELECT 
  'organization',
  o.id,
  '273f9d2d-2045-4104-ba0b-681fae5803b2',
  'simon@simon.se',
  'full',
  '273f9d2d-2045-4104-ba0b-681fae5803b2',
  NOW(),
  NOW(),
  NOW(),
  true
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM access_grants ag 
  WHERE ag.resource_type = 'organization' 
  AND ag.resource_id = o.id 
  AND ag.user_id = '273f9d2d-2045-4104-ba0b-681fae5803b2'
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show final enum values
SELECT 'Final verification - enum values:' as info;
SELECT unnest(enum_range(NULL::resource_type)) as final_values;

-- Show existing organizations
SELECT 'Existing organizations:' as info;
SELECT id, name, updated_at FROM organizations;

-- Show access grants for organizations
SELECT 'Organization access grants:' as info;
SELECT 
  ag.resource_id,
  o.name as org_name,
  ag.user_id,
  ag.email,
  ag.access_level,
  ag.is_active
FROM access_grants ag
JOIN organizations o ON o.id = ag.resource_id
WHERE ag.resource_type = 'organization';

SELECT 'Setup complete!' as status;
