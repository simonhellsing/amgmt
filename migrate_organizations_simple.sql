-- =====================================================
-- SIMPLE ORGANIZATIONS MIGRATION - ADD MISSING COLUMNS
-- =====================================================

-- Add missing columns to existing organizations table if they don't exist
DO $$ 
BEGIN
  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE organizations ADD COLUMN image_url TEXT;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Add organization_id to artists table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE artists ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_artists_organization_id ON artists(organization_id);

-- =====================================================
-- ENABLE RLS FOR ORGANIZATIONS
-- =====================================================

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view organizations with access" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Organization admins can create organizations" ON organizations;

-- Allow users to see organizations they have access to
CREATE POLICY "Users can view organizations with access" ON organizations
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT DISTINCT resource_id 
    FROM access_grants 
    WHERE resource_type = 'organization' 
    AND user_id = auth.uid() 
    AND is_active = true
  )
  OR 
  -- Users can also see organizations of artists they have access to
  id IN (
    SELECT DISTINCT a.organization_id
    FROM artists a
    JOIN access_grants ag ON ag.resource_id = a.id
    WHERE ag.resource_type = 'artist'
    AND ag.user_id = auth.uid()
    AND ag.is_active = true
    AND a.organization_id IS NOT NULL
  )
  OR
  -- Users can see organizations of releases they have access to
  id IN (
    SELECT DISTINCT a.organization_id
    FROM artists a
    JOIN release_artists ra ON ra.artist_id = a.id
    JOIN access_grants ag ON ag.resource_id = ra.release_id
    WHERE ag.resource_type = 'release'
    AND ag.user_id = auth.uid()
    AND ag.is_active = true
    AND a.organization_id IS NOT NULL
  )
);

-- Allow organization admins to update organization details
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

-- Allow organization admins to insert new organizations
CREATE POLICY "Organization admins can create organizations" ON organizations
FOR INSERT TO authenticated
WITH CHECK (true); -- We'll control this through application logic

-- =====================================================
-- SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Create a sample organization (only if it doesn't exist)
INSERT INTO organizations (id, name)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Sample Records')
ON CONFLICT (id) DO NOTHING;

-- You can link existing artists to this organization if desired
-- UPDATE artists SET organization_id = '550e8400-e29b-41d4-a716-446655440000' WHERE id IN (SELECT id FROM artists LIMIT 3);
