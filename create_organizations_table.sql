-- =====================================================
-- CREATE ORGANIZATIONS TABLE
-- =====================================================
-- Simple script to add organizations support to your database

-- Step 1: Create the organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add 'organization' to resource_type enum (if not already there)
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

-- Step 3: Add organization_id to artists table (if not already there)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artists' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE artists ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_artists_organization_id ON artists(organization_id);

-- Step 5: Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop any existing policies
DROP POLICY IF EXISTS "Users can view organizations with access" ON organizations;
DROP POLICY IF EXISTS "Organization admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- Step 7: Create RLS policies
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
);

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

CREATE POLICY "Authenticated users can create organizations" ON organizations
FOR INSERT TO authenticated
WITH CHECK (true);

-- Step 8: Insert a default organization
INSERT INTO organizations (name)
VALUES ('My Organization')
ON CONFLICT DO NOTHING;

-- Step 9: Grant full access to simonhellsing@gmail.com
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
  up.id,
  up.email,
  'full',
  up.id,
  NOW(),
  NOW(),
  NOW(),
  true
FROM organizations o
CROSS JOIN user_profiles up
WHERE up.email = 'simonhellsing@gmail.com'
ON CONFLICT (resource_type, resource_id, email) DO NOTHING;

-- Step 10: Verify
SELECT 
  '✓ Organizations table created and configured' as status,
  COUNT(*) as org_count 
FROM organizations;

SELECT 
  '✓ Access granted to ' || up.email as status,
  o.name as organization_name
FROM access_grants ag
JOIN organizations o ON ag.resource_id = o.id
JOIN user_profiles up ON ag.user_id = up.id
WHERE ag.resource_type = 'organization'
AND up.email = 'simonhellsing@gmail.com';

