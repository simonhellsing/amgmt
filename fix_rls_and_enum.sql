-- =====================================================
-- FIX RLS POLICIES AND ENUM FOR ORGANIZATIONS
-- =====================================================

-- First, let's update the resource_type enum to include 'organization'
-- Check current enum values
-- SELECT unnest(enum_range(NULL::resource_type));

-- Add 'organization' to the resource_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'organization' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'resource_type')
    ) THEN
        ALTER TYPE resource_type ADD VALUE 'organization';
    END IF;
END $$;

-- =====================================================
-- UPDATE RLS POLICIES FOR ORGANIZATIONS
-- =====================================================

-- Drop the restrictive organization policies
DROP POLICY IF EXISTS "Users can view organizations with access" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can create organizations" ON organizations;

-- Create more permissive policies for now (we can tighten them later)

-- Allow all authenticated users to view organizations
-- (In production, you might want to restrict this further)
CREATE POLICY "Authenticated users can view organizations" ON organizations
FOR SELECT TO authenticated
USING (true);

-- Allow all authenticated users to create organizations
-- (This will create the org, then we'll add access grants separately)
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
-- CREATE TRIGGER TO AUTO-GRANT FULL ACCESS TO CREATOR
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
-- VERIFY ENUM UPDATE
-- =====================================================

-- Test if the enum was updated correctly
-- You can run this query to verify:
-- SELECT unnest(enum_range(NULL::resource_type));
