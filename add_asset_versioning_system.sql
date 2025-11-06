-- =====================================================
-- ASSET VERSIONING, TAGS, USAGE RIGHTS & HISTORY SYSTEM
-- =====================================================

-- =====================================================
-- 1. ADD VERSION SUPPORT TO DELIVERABLE_FILES
-- =====================================================
-- Add version_number column to track which version a file is
ALTER TABLE deliverable_files 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

ALTER TABLE deliverable_files 
ADD COLUMN IF NOT EXISTS parent_file_id UUID REFERENCES deliverable_files(id) ON DELETE SET NULL;

ALTER TABLE deliverable_files 
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

ALTER TABLE deliverable_files 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true;

-- Create index for version queries
CREATE INDEX IF NOT EXISTS idx_deliverable_files_parent_file_id ON deliverable_files(parent_file_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_files_version_number ON deliverable_files(version_number);

-- =====================================================
-- 2. CREATE FILE TAGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS file_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES deliverable_files(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(file_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag);

-- Enable RLS
ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_tags
CREATE POLICY "Users can view tags for accessible files" ON file_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deliverable_files df
      JOIN deliverables d ON df.deliverable_id = d.id
      JOIN releases r ON d.release_id = r.id
      WHERE df.id = file_tags.file_id
      AND EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.resource_type = 'release'
        AND ag.resource_id = r.id
        AND ag.user_id = auth.uid()
        AND ag.is_active = true
      )
    )
  );

CREATE POLICY "Users can insert tags for accessible files" ON file_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliverable_files df
      JOIN deliverables d ON df.deliverable_id = d.id
      JOIN releases r ON d.release_id = r.id
      WHERE df.id = file_tags.file_id
      AND EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.resource_type = 'release'
        AND ag.resource_id = r.id
        AND ag.user_id = auth.uid()
        AND ag.is_active = true
      )
    )
  );

CREATE POLICY "Users can delete tags for accessible files" ON file_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM deliverable_files df
      JOIN deliverables d ON df.deliverable_id = d.id
      JOIN releases r ON d.release_id = r.id
      WHERE df.id = file_tags.file_id
      AND EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.resource_type = 'release'
        AND ag.resource_id = r.id
        AND ag.user_id = auth.uid()
        AND ag.is_active = true
      )
    )
  );

-- =====================================================
-- 3. CREATE USAGE RIGHTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS file_usage_rights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES deliverable_files(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  owner_type TEXT NOT NULL, -- 'person', 'company', 'organization'
  rights_description TEXT,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_file_usage_rights_file_id ON file_usage_rights(file_id);

-- Enable RLS
ALTER TABLE file_usage_rights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_usage_rights
CREATE POLICY "Users can view usage rights for accessible files" ON file_usage_rights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deliverable_files df
      JOIN deliverables d ON df.deliverable_id = d.id
      JOIN releases r ON d.release_id = r.id
      WHERE df.id = file_usage_rights.file_id
      AND EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.resource_type = 'release'
        AND ag.resource_id = r.id
        AND ag.user_id = auth.uid()
        AND ag.is_active = true
      )
    )
  );

CREATE POLICY "Users can insert usage rights for accessible files" ON file_usage_rights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliverable_files df
      JOIN deliverables d ON df.deliverable_id = d.id
      JOIN releases r ON d.release_id = r.id
      WHERE df.id = file_usage_rights.file_id
      AND EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.resource_type = 'release'
        AND ag.resource_id = r.id
        AND ag.user_id = auth.uid()
        AND ag.is_active = true
      )
    )
  );

CREATE POLICY "Users can update usage rights for accessible files" ON file_usage_rights
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM deliverable_files df
      JOIN deliverables d ON df.deliverable_id = d.id
      JOIN releases r ON d.release_id = r.id
      WHERE df.id = file_usage_rights.file_id
      AND EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.resource_type = 'release'
        AND ag.resource_id = r.id
        AND ag.user_id = auth.uid()
        AND ag.is_active = true
      )
    )
  );

CREATE POLICY "Users can delete usage rights for accessible files" ON file_usage_rights
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM deliverable_files df
      JOIN deliverables d ON df.deliverable_id = d.id
      JOIN releases r ON d.release_id = r.id
      WHERE df.id = file_usage_rights.file_id
      AND EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.resource_type = 'release'
        AND ag.resource_id = r.id
        AND ag.user_id = auth.uid()
        AND ag.is_active = true
      )
    )
  );

-- =====================================================
-- 4. CREATE FILE HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS file_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES deliverable_files(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'created', 'version_created', 'status_changed', 'tagged', 'rights_added', etc.
  action_description TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB -- Store additional context like old_status, new_status, version_number, etc.
);

CREATE INDEX IF NOT EXISTS idx_file_history_file_id ON file_history(file_id);
CREATE INDEX IF NOT EXISTS idx_file_history_created_at ON file_history(created_at DESC);

-- Enable RLS
ALTER TABLE file_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for file_history
CREATE POLICY "Users can view history for accessible files" ON file_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deliverable_files df
      JOIN deliverables d ON df.deliverable_id = d.id
      JOIN releases r ON d.release_id = r.id
      WHERE df.id = file_history.file_id
      AND EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.resource_type = 'release'
        AND ag.resource_id = r.id
        AND ag.user_id = auth.uid()
        AND ag.is_active = true
      )
    )
  );

CREATE POLICY "Users can insert history for accessible files" ON file_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliverable_files df
      JOIN deliverables d ON df.deliverable_id = d.id
      JOIN releases r ON d.release_id = r.id
      WHERE df.id = file_history.file_id
      AND EXISTS (
        SELECT 1 FROM access_grants ag
        WHERE ag.resource_type = 'release'
        AND ag.resource_id = r.id
        AND ag.user_id = auth.uid()
        AND ag.is_active = true
      )
    )
  );

-- =====================================================
-- 5. CREATE FUNCTION TO LOG FILE HISTORY
-- =====================================================
CREATE OR REPLACE FUNCTION log_file_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Log creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO file_history (file_id, action_type, action_description, performed_by, metadata)
    VALUES (
      NEW.id,
      'created',
      'File created',
      NEW.uploaded_by,
      jsonb_build_object(
        'file_name', NEW.name,
        'file_type', NEW.file_type,
        'version_number', NEW.version_number
      )
    );
    RETURN NEW;
  END IF;

  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO file_history (file_id, action_type, action_description, performed_by, metadata)
    VALUES (
      NEW.id,
      'status_changed',
      'Status changed from ' || COALESCE(OLD.status, 'none') || ' to ' || COALESCE(NEW.status, 'none'),
      auth.uid(),
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_file_history ON deliverable_files;
CREATE TRIGGER trigger_log_file_history
  AFTER INSERT OR UPDATE ON deliverable_files
  FOR EACH ROW
  EXECUTE FUNCTION log_file_history();

-- =====================================================
-- 6. UPDATE EXISTING FILES TO HAVE VERSION 1 AND PRIMARY FLAG
-- =====================================================
UPDATE deliverable_files 
SET version_number = 1, is_primary = true 
WHERE version_number IS NULL OR is_primary IS NULL;

-- =====================================================
-- 7. CREATE FUNCTION TO GET PRIMARY FILE VERSION
-- =====================================================
CREATE OR REPLACE FUNCTION get_primary_file_version(file_id_param UUID)
RETURNS UUID AS $$
DECLARE
  primary_file_id UUID;
BEGIN
  -- First check if the file itself is primary
  SELECT id INTO primary_file_id
  FROM deliverable_files
  WHERE id = file_id_param AND is_primary = true;
  
  -- If not found, check if there's a parent and get its primary
  IF primary_file_id IS NULL THEN
    SELECT id INTO primary_file_id
    FROM deliverable_files
    WHERE (parent_file_id = file_id_param OR id = (SELECT parent_file_id FROM deliverable_files WHERE id = file_id_param))
    AND is_primary = true
    ORDER BY version_number DESC
    LIMIT 1;
  END IF;
  
  -- If still not found, return the file itself
  RETURN COALESCE(primary_file_id, file_id_param);
END;
$$ LANGUAGE plpgsql;


