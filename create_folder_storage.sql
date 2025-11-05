-- Create folder-files storage bucket
-- Note: This needs to be run in Supabase Dashboard -> Storage

-- The bucket should be created manually in the Supabase Dashboard:
-- 1. Go to Storage in your Supabase Dashboard
-- 2. Click "Create a new bucket"
-- 3. Name it "folder-files"
-- 4. Make it public
-- 5. Set up RLS policies

-- RLS policies for folder-files bucket
CREATE POLICY "Users can upload folder files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'folder-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view folder files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'folder-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update folder files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'folder-files' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete folder files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'folder-files' AND
    auth.role() = 'authenticated'
  );
