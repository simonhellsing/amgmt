-- Fix folder RLS policies to allow folder creation

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view folders for accessible artists" ON folders;
DROP POLICY IF EXISTS "Users can insert folders for accessible artists" ON folders;
DROP POLICY IF EXISTS "Users can update folders for accessible artists" ON folders;
DROP POLICY IF EXISTS "Users can delete folders for accessible artists" ON folders;

-- Create simpler policies that allow authenticated users to manage folders
CREATE POLICY "Users can view folders for accessible artists" ON folders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert folders for accessible artists" ON folders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update folders for accessible artists" ON folders
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete folders for accessible artists" ON folders
  FOR DELETE USING (auth.role() = 'authenticated');

-- Also fix folder_files policies
DROP POLICY IF EXISTS "Users can view folder files for accessible folders" ON folder_files;
DROP POLICY IF EXISTS "Users can insert folder files for accessible folders" ON folder_files;
DROP POLICY IF EXISTS "Users can delete folder files for accessible folders" ON folder_files;

CREATE POLICY "Users can view folder files for accessible folders" ON folder_files
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert folder files for accessible folders" ON folder_files
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can delete folder files for accessible folders" ON folder_files
  FOR DELETE USING (auth.role() = 'authenticated');
