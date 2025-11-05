-- =====================================================
-- ORGANIZATIONS TABLE AND CASCADING ACCESS SUPPORT
-- =====================================================

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add organization_id to artists table
ALTER TABLE artists 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_artists_organization_id ON artists(organization_id);

-- Update the ResourceType enum to include organization
-- Note: This would typically be done through a proper migration in production
-- For now, we'll handle this in the TypeScript types

-- =====================================================
-- HELPER FUNCTIONS FOR CASCADING ACCESS
-- =====================================================

-- Function to get all parent resource IDs for a given resource
CREATE OR REPLACE FUNCTION get_parent_resources(
  p_resource_type text,
  p_resource_id uuid
) RETURNS TABLE (
  resource_type text,
  resource_id uuid,
  level_priority int
) AS $$
BEGIN
  -- Return the resource itself first (highest priority)
  RETURN QUERY
  SELECT p_resource_type, p_resource_id, 0 as level_priority;
  
  -- If it's a release, also return its artist(s) and organization(s)
  IF p_resource_type = 'release' THEN
    -- Get artists for this release
    RETURN QUERY
    SELECT 'artist'::text, ra.artist_id, 1 as level_priority
    FROM release_artists ra
    WHERE ra.release_id = p_resource_id;
    
    -- Get organizations for artists of this release
    RETURN QUERY
    SELECT 'organization'::text, a.organization_id, 2 as level_priority
    FROM release_artists ra
    JOIN artists a ON a.id = ra.artist_id
    WHERE ra.release_id = p_resource_id
    AND a.organization_id IS NOT NULL;
  END IF;
  
  -- If it's a deliverable, get its release, artist(s), and organization(s)
  IF p_resource_type = 'deliverable' THEN
    -- Get the release for this deliverable
    RETURN QUERY
    SELECT 'release'::text, d.release_id, 1 as level_priority
    FROM deliverables d
    WHERE d.id = p_resource_id;
    
    -- Get artists for the release of this deliverable
    RETURN QUERY
    SELECT 'artist'::text, ra.artist_id, 2 as level_priority
    FROM deliverables d
    JOIN release_artists ra ON ra.release_id = d.release_id
    WHERE d.id = p_resource_id;
    
    -- Get organizations for artists of the release of this deliverable
    RETURN QUERY
    SELECT 'organization'::text, a.organization_id, 3 as level_priority
    FROM deliverables d
    JOIN release_artists ra ON ra.release_id = d.release_id
    JOIN artists a ON a.id = ra.artist_id
    WHERE d.id = p_resource_id
    AND a.organization_id IS NOT NULL;
  END IF;
  
  -- If it's an artist, also return its organization
  IF p_resource_type = 'artist' THEN
    RETURN QUERY
    SELECT 'organization'::text, a.organization_id, 1 as level_priority
    FROM artists a
    WHERE a.id = p_resource_id
    AND a.organization_id IS NOT NULL;
  END IF;
  
  -- Organization is already the top level, no parents to return
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Create a sample organization
INSERT INTO organizations (id, name, description)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Sample Records', 'A sample record label organization')
ON CONFLICT (id) DO NOTHING;

-- You can link existing artists to this organization if desired
-- UPDATE artists SET organization_id = '550e8400-e29b-41d4-a716-446655440000' WHERE id IN (SELECT id FROM artists LIMIT 3);

-- =====================================================
-- ENABLE RLS FOR ORGANIZATIONS
-- =====================================================

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

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

-- Allow organization admins to insert new organizations (if we add that feature)
CREATE POLICY "Organization admins can create organizations" ON organizations
FOR INSERT TO authenticated
WITH CHECK (true); -- We'll control this through application logic
