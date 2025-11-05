-- Test if folders table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'folders'
) as folders_table_exists;

-- Test if folder_files table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'folder_files'
) as folder_files_table_exists;

-- Check if we can query the folders table
SELECT COUNT(*) as folder_count FROM folders;
