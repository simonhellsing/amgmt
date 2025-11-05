-- Quick fix for organization enum and access

-- First, let's see what columns exist in organizations table
SELECT 'Organizations table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'organizations' 
ORDER BY ordinal_position;

-- Check current enum values
SELECT 'Current resource_type enum values:' as info;
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
SELECT 'Updated resource_type enum values:' as info;
SELECT unnest(enum_range(NULL::resource_type)) as updated_values;

-- Simple policy: allow authenticated users to create organizations
DROP POLICY IF EXISTS "Allow users to create organizations" ON organizations;
CREATE POLICY "Allow users to create organizations" ON organizations
FOR INSERT TO authenticated
WITH CHECK (true);

-- Grant yourself access to existing organizations
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

SELECT 'Quick fix complete! Try creating an organization now.' as status;
