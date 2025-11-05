-- Complete folders migration - run this to create all necessary tables and policies

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create folder_files table to link folders to files
CREATE TABLE IF NOT EXISTS folder_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES deliverable_files(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(folder_id, file_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_artist_id ON folders(artist_id);
CREATE INDEX IF NOT EXISTS idx_folder_files_folder_id ON folder_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_files_file_id ON folder_files(file_id);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_files ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view folders for accessible artists" ON folders;
DROP POLICY IF EXISTS "Users can insert folders for accessible artists" ON folders;
DROP POLICY IF EXISTS "Users can update folders for accessible artists" ON folders;
DROP POLICY IF EXISTS "Users can delete folders for accessible artists" ON folders;

DROP POLICY IF EXISTS "Users can view folder files for accessible folders" ON folder_files;
DROP POLICY IF EXISTS "Users can insert folder files for accessible folders" ON folder_files;
DROP POLICY IF EXISTS "Users can delete folder files for accessible folders" ON folder_files;

-- Create new policies with proper type casting
CREATE POLICY "Users can view folders for accessible artists" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = folders.artist_id
      AND a.organization_id::text = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY "Users can insert folders for accessible artists" ON folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = folders.artist_id
      AND a.organization_id::text = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY "Users can update folders for accessible artists" ON folders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = folders.artist_id
      AND a.organization_id::text = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY "Users can delete folders for accessible artists" ON folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = folders.artist_id
      AND a.organization_id::text = auth.jwt() ->> 'organization_id'
    )
  );

-- Folder files policies
CREATE POLICY "Users can view folder files for accessible folders" ON folder_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM folders f
      JOIN artists a ON a.id = f.artist_id
      WHERE f.id = folder_files.folder_id
      AND a.organization_id::text = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY "Users can insert folder files for accessible folders" ON folder_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM folders f
      JOIN artists a ON a.id = f.artist_id
      WHERE f.id = folder_files.folder_id
      AND a.organization_id::text = auth.jwt() ->> 'organization_id'
    )
  );

CREATE POLICY "Users can delete folder files for accessible folders" ON folder_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM folders f
      JOIN artists a ON a.id = f.artist_id
      WHERE f.id = folder_files.folder_id
      AND a.organization_id::text = auth.jwt() ->> 'organization_id'
    )
  );

-- Verify tables were created
SELECT 'folders table created successfully' as status WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'folders'
);

SELECT 'folder_files table created successfully' as status WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'folder_files'
);
