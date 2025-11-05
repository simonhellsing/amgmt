# Setup Folder Storage Bucket

## Option 1: Create the bucket manually (Recommended)

1. **Go to Supabase Dashboard** → **Storage**
2. **Click "Create a new bucket"**
3. **Bucket name**: `folder-files`
4. **Make it public**: ✅ Check this box
5. **Click "Create bucket"**

## Option 2: Use existing deliverable-files bucket (Fallback)

The code will automatically fallback to using the `deliverable-files` bucket if `folder-files` doesn't exist.

## Option 3: Run SQL to create bucket (Advanced)

If you have access to the Supabase CLI or can run SQL commands:

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('folder-files', 'folder-files', true);

-- Set up RLS policies
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
```

## Test the upload

After setting up the bucket, try uploading a file again. The console will show detailed error information if there are still issues.
