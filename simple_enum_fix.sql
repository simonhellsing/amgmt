-- =====================================================
-- SIMPLE ENUM FIX FOR RESOURCE_TYPE
-- =====================================================

-- Check what enum values currently exist
SELECT unnest(enum_range(NULL::resource_type)) as current_values;

-- Add 'organization' to the enum
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'organization';

-- Verify the enum was updated
SELECT unnest(enum_range(NULL::resource_type)) as updated_values;

-- Also create a simple access grant for the sample organization if it doesn't exist
-- (Replace the user_id with your actual user ID: 273f9d2d-2045-4104-ba0b-681fae5803b2)
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
  '550e8400-e29b-41d4-a716-446655440000', -- Sample Records org ID
  '273f9d2d-2045-4104-ba0b-681fae5803b2', -- Your user ID
  'simon@simon.se', -- Your email (replace with actual)
  'full',
  '273f9d2d-2045-4104-ba0b-681fae5803b2',
  NOW(),
  NOW(),
  NOW(),
  true
) ON CONFLICT DO NOTHING;
