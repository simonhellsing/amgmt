-- Fix RLS policies with a simpler approach

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view folders for accessible artists" ON folders;
DROP POLICY IF EXISTS "Users can insert folders for accessible artists" ON folders;
DROP POLICY IF EXISTS "Users can update folders for accessible artists" ON folders;
DROP POLICY IF EXISTS "Users can delete folders for accessible artists" ON folders;

-- Create simpler policies that allow authenticated users to manage folders
CREATE POLICY "Users can view folders for accessible artists" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = folders.artist_id
    )
  );

CREATE POLICY "Users can insert folders for accessible artists" ON folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = folders.artist_id
    )
  );

CREATE POLICY "Users can update folders for accessible artists" ON folders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = folders.artist_id
    )
  );

CREATE POLICY "Users can delete folders for accessible artists" ON folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM artists a
      WHERE a.id = folders.artist_id
    )
  );

-- Also fix folder_files policies
DROP POLICY IF EXISTS "Users can view folder files for accessible folders" ON folder_files;
DROP POLICY IF EXISTS "Users can insert folder files for accessible folders" ON folder_files;
DROP POLICY IF EXISTS "Users can delete folder files for accessible folders" ON folder_files;

CREATE POLICY "Users can view folder files for accessible folders" ON folder_files
  FOR SELECT USING (true);

CREATE POLICY "Users can insert folder files for accessible folders" ON folder_files
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete folder files for accessible folders" ON folder_files
  FOR DELETE USING (true);
