-- Grant access to the user for testing
-- Replace 'ccff5ea3-3e13-42e1-a117-f8d0fecc6889' with the actual user ID

-- First, let's see what artists exist
SELECT id, name FROM artists LIMIT 5;

-- Grant artist access to the first few artists
INSERT INTO access_grants (
  user_id,
  resource_type,
  resource_id,
  access_level,
  is_active,
  granted_by,
  granted_at
) VALUES 
  ('ccff5ea3-3e13-42e1-a117-f8d0fecc6889', 'artist', '34e50458-a1a9-4841-8955-b22bce2a7742', 'view', true, 'ccff5ea3-3e13-42e1-a117-f8d0fecc6889', NOW()),
  ('ccff5ea3-3e13-42e1-a117-f8d0fecc6889', 'artist', '34e50458-a1a9-4841-8955-b22bce2a7742', 'edit', true, 'ccff5ea3-3e13-42e1-a117-f8d0fecc6889', NOW());

-- Or grant organization access (which gives access to all artists in that org)
-- INSERT INTO access_grants (
--   user_id,
--   resource_type,
--   resource_id,
--   access_level,
--   is_active,
--   granted_by,
--   granted_at
-- ) VALUES 
--   ('ccff5ea3-3e13-42e1-a117-f8d0fecc6889', 'organization', '74861af8-9b5b-4dab-9de8-270355d2d4f9', 'view', true, 'ccff5ea3-3e13-42e1-a117-f8d0fecc6889', NOW());
