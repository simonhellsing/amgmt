-- =====================================================
-- UPDATE COMMENTS SYSTEM FOR VERSIONING
-- =====================================================
-- This migration updates the file_comments table to support versioning
-- Comments will be linked to the container root (asset) instead of individual versions
-- Each comment will track which version was current when it was posted

-- Add container_file_id column to link comments to the asset container (root file)
ALTER TABLE file_comments 
ADD COLUMN IF NOT EXISTS container_file_id UUID REFERENCES deliverable_files(id) ON DELETE CASCADE;

-- Add version_number column to track which version was current when comment was posted
ALTER TABLE file_comments 
ADD COLUMN IF NOT EXISTS version_number INTEGER;

-- Create index for container queries
CREATE INDEX IF NOT EXISTS idx_file_comments_container_file_id ON file_comments(container_file_id);

-- Migrate existing comments to use container_file_id
-- For existing comments, set container_file_id to the file_id (assuming they're on root files)
-- If the file has a parent_file_id, use that as the container
UPDATE file_comments
SET container_file_id = COALESCE(
  (SELECT parent_file_id FROM deliverable_files WHERE id = file_comments.file_id),
  file_comments.file_id
)
WHERE container_file_id IS NULL;

-- For existing comments, try to get version_number from the file
UPDATE file_comments
SET version_number = COALESCE(
  (SELECT version_number FROM deliverable_files WHERE id = file_comments.file_id),
  1
)
WHERE version_number IS NULL;

-- Set container_file_id to file_id for comments that don't have a parent (backward compatibility)
UPDATE file_comments
SET container_file_id = file_id
WHERE container_file_id IS NULL;

